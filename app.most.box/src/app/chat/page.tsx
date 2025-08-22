"use client";
import { AppHeader } from "@/components/AppHeader";
import { useUserStore } from "@/stores/userStore";
import {
  Button,
  Container,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
  Paper,
  Badge,
  Tooltip,
  ActionIcon,
  CopyButton,
  SimpleGrid,
  Center,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPhone, IconPhoneCall } from "@tabler/icons-react";
import { useRef, useState, useEffect } from "react";

type Role = "joiner" | "creator";

type SignalMessage = {
  from: string;
  type: "offer" | "answer" | "candidate" | "hello";
  payload?: any;
  ts?: number;
};

export default function PageWebRTC() {
  const dotAPI = useUserStore((state) => state.dotAPI);

  const [roomId, setRoomId] = useState<string>("most.box");
  const [clientId, setClientId] = useState<string>("");
  const [role, setRole] = useState<Role | null>(null);
  const [connected, setConnected] = useState(false);

  const clientIdReady = clientId.length > 0;
  const esRef = useRef<EventSource | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const roleRef = useRef<Role | null>(null);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  const statusText = connected
    ? `已连接${role ? `（${role === "creator" ? "创建者" : "加入者"}）` : ""}`
    : "未连接";
  const statusColor: any = connected ? "green" : "gray";

  // ---- Helpers ----
  const safePlay = async (el: HTMLVideoElement | null) => {
    if (!el) return;
    try {
      await el.play();
    } catch (error) {
      console.info("视频播放失败", error);
    }
  };

  const attachLocalStream = async (
    pc: RTCPeerConnection,
    stream: MediaStream
  ) => {
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      await safePlay(localVideoRef.current);
    }
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  };

  const getLocalMediaWithFallback = async () => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: 640, height: 360 },
      });
    } catch (err) {
      console.info("获取视频失败", err);
      notifications.show({
        message: "请检查摄像头权限",
        color: "orange",
      });
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      } catch (err) {
        console.info("获取音频失败", err);
        notifications.show({
          message: "请检查麦克风权限",
          color: "orange",
        });
      }
    }
  };

  const drainPendingCandidates = async (pc: RTCPeerConnection) => {
    if (!pendingCandidatesRef.current.length) return;
    const queued = pendingCandidatesRef.current.splice(0);
    for (const c of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (err) {
        console.info("添加 ICE 候选失败", err);
      }
    }
  };

  const applyRemoteDescriptionAndDrain = async (
    pc: RTCPeerConnection,
    desc: RTCSessionDescriptionInit
  ) => {
    await pc.setRemoteDescription(new RTCSessionDescription(desc));
    await drainPendingCandidates(pc);
  };

  const queueOrAddCandidate = async (
    pc: RTCPeerConnection,
    candidate: RTCIceCandidateInit
  ) => {
    try {
      if (!pc.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
      } else {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.info("添加 ICE 候选失败", err);
    }
  };

  const postSignal = async (msg: {
    roomId: string;
    from: string;
    to?: string;
    type: SignalMessage["type"];
    payload?: any;
  }) => {
    try {
      await fetch(`${dotAPI}/api.signaling`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
    } catch (err) {
      console.info("发送信号失败", err);
    }
  };

  const setupPeerConnection = async () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.oniceconnectionstatechange = () => {};
    pc.onconnectionstatechange = () => {};

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        postSignal({
          roomId,
          from: clientId,
          type: "candidate",
          payload: event.candidate,
        });
      }
    };

    pc.ontrack = (ev) => {
      if (!remoteVideoRef.current) return;
      const [stream] = ev.streams;
      if (stream) {
        remoteVideoRef.current.srcObject = stream;
        safePlay(remoteVideoRef.current);
      }
    };

    const local = await getLocalMediaWithFallback();
    if (local) {
      await attachLocalStream(pc, local);
    }

    pcRef.current = pc;
    return pc;
  };

  const subscribeSSE = () => {
    if (esRef.current) esRef.current.close();
    const url = new URL(dotAPI);
    url.pathname = "/sse.signaling";
    url.searchParams.append("roomId", roomId);
    url.searchParams.append("clientId", clientId);

    const es = new EventSource(url.href, { withCredentials: false });

    es.onopen = () => {
      setConnected(true);
      const pc = pcRef.current;
      if (
        roleRef.current === "joiner" &&
        pc?.localDescription?.type === "offer"
      ) {
        postSignal({
          roomId,
          from: clientId,
          type: "offer",
          payload: pc.localDescription,
        });
      }
    };

    es.onerror = (err) => {
      console.info("SSE 连接错误", err);
    };

    es.onmessage = async (ev) => {
      try {
        const data: SignalMessage = JSON.parse(ev.data);
        if (!data || !data.type) return;
        if (data.type === "hello") {
          return;
        }

        const pc = pcRef.current;
        if (!pc) return;

        if (data.type === "offer" && roleRef.current === "creator") {
          await applyRemoteDescriptionAndDrain(pc, data.payload);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await postSignal({
            roomId,
            from: clientId,
            type: "answer",
            payload: answer,
          });
        } else if (data.type === "answer" && roleRef.current === "joiner") {
          await applyRemoteDescriptionAndDrain(pc, data.payload);
        } else if (data.type === "candidate") {
          await queueOrAddCandidate(pc, data.payload);
        }
      } catch (err) {
        console.info("处理信号失败", err);
      }
    };

    esRef.current = es;
  };

  const connect = async (as: Role) => {
    try {
      roleRef.current = as; // ensure immediate consistency

      pendingCandidatesRef.current = [];

      await setupPeerConnection();

      setRole(as);
      subscribeSSE();

      if (as === "joiner") {
        const pc = pcRef.current!;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await postSignal({
          roomId,
          from: clientId,
          type: "offer",
          payload: offer,
        });
      }
    } catch {}
  };

  const disconnect = () => {
    esRef.current?.close();
    esRef.current = null;
    setConnected(false);
    setRole(null);

    const pc = pcRef.current;
    if (pc) {
      pc.getSenders().forEach((s) => {
        try {
          s.track?.stop();
        } catch (err) {
          console.info("停止发送器失败", err);
        }
      });
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
      pcRef.current = null;
    }

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
  };

  useEffect(() => {
    return () => {
      // cleanup on unmount
      disconnect();
    };
  }, []);

  useEffect(() => {
    // Generate clientId only on client to avoid SSR/CSR mismatch
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as Crypto & { randomUUID: () => string }).randomUUID()
        : String(Math.random()).slice(2);
    setClientId(id);
  }, []);

  return (
    <Container py="md">
      <AppHeader title="WebRTC Demo (HTTP + SSE)" />

      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={3} style={{ lineHeight: 1 }}>
            WebRTC Demo - HTTP + SSE
          </Title>
          <Badge
            color={statusColor}
            variant="light"
            aria-live="polite"
            aria-atomic
          >
            {statusText}
          </Badge>
        </Group>

        <Paper p="md" withBorder radius="md">
          <Group align="flex-end" wrap="wrap">
            <TextInput
              label="房间 ID"
              description="双方需使用相同的房间 ID 才可建立连接"
              value={roomId}
              onChange={(e) => setRoomId(e.currentTarget.value)}
              placeholder="输入房间 ID（如：most.box）"
              style={{ minWidth: 260, flex: 1 }}
              rightSection={
                <CopyButton value={roomId} timeout={1000}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? "已复制" : "复制"}>
                      <ActionIcon
                        variant={copied ? "filled" : "light"}
                        color={copied ? "teal" : "gray"}
                        onClick={copy}
                        aria-label="复制房间ID"
                      >
                        {copied ? "✓" : "⧉"}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              }
            />

            <Group gap="xs" wrap="wrap">
              <Button
                onClick={() => connect("creator")}
                disabled={!clientIdReady || connected}
                leftSection={<IconPhone size={16} />}
              >
                创建
              </Button>

              <Button
                onClick={() => connect("joiner")}
                disabled={!clientIdReady || connected}
                leftSection={<IconPhoneCall size={16} />}
                variant="light"
              >
                加入
              </Button>

              <Button
                color="red"
                variant="light"
                onClick={disconnect}
                disabled={!connected}
                aria-label="断开连接"
              >
                断开
              </Button>

              {role === "joiner" && (
                <Button
                  variant="light"
                  color="teal"
                  onClick={() => {
                    const pc = pcRef.current;
                    if (pc?.localDescription?.type === "offer") {
                      postSignal({
                        roomId,
                        from: clientId,
                        type: "offer",
                        payload: pc.localDescription,
                      });
                    }
                  }}
                  disabled={!connected}
                >
                  重试
                </Button>
              )}
            </Group>
          </Group>
        </Paper>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Paper p="sm" withBorder radius="md">
            <Center>
              <Text>我</Text>
            </Center>
            <video
              ref={localVideoRef}
              playsInline
              autoPlay
              muted
              aria-label="本地媒体流视频"
              title="本地媒体流视频"
              style={{
                width: "100%",
                maxWidth: 560,
                borderRadius: 8,
                background: "#111",
              }}
            />
          </Paper>
          <Paper p="sm" withBorder radius="md">
            <Center>
              <Text>你</Text>
            </Center>
            <video
              ref={remoteVideoRef}
              playsInline
              autoPlay
              aria-label="远端媒体流视频"
              title="远端媒体流视频"
              style={{
                width: "100%",
                maxWidth: 560,
                borderRadius: 8,
                background: "#111",
              }}
            />
          </Paper>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
