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
  Divider,
  SimpleGrid,
} from "@mantine/core";
import { IconPhone, IconPhoneCall } from "@tabler/icons-react";
import { useRef, useState, useEffect } from "react";

type Role = "caller" | "callee";

type SignalMessage = {
  from: string;
  type: "offer" | "answer" | "candidate" | "hello";
  payload?: any;
  ts?: number;
};

export default function PageWebRTC() {
  const dotAPI = useUserStore((state) => state.dotAPI);

  const SSE_URL = `${dotAPI}/api.signaling/sse`;
  const POST_URL = `${dotAPI}/api.signaling`;

  const [roomId, setRoomId] = useState<string>("demo-room");
  const [clientId, setClientId] = useState<string>("");
  const [role, setRole] = useState<Role | null>(null);
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);

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

  const appendLog = (s: string) => setLog((prev) => [s, ...prev].slice(0, 200));
  const clearLogs = () => setLog([]);

  const statusText = connected
    ? `已连接${role ? `（${role}）` : ""}`
    : "未连接";
  const statusColor: any = connected ? "green" : "gray";

  // ---- Helpers ----
  const safePlay = async (el: HTMLVideoElement | null) => {
    if (!el) return;
    try {
      await el.play();
    } catch (e) {
      appendLog(`video play blocked: ${e}`);
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

  const getLocalMediaWithFallback = async (): Promise<MediaStream> => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: 640, height: 360 },
      });
    } catch (e) {
      appendLog(`getUserMedia video failed, fallback to audio-only: ${e}`);
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    }
  };

  const drainPendingCandidates = async (pc: RTCPeerConnection) => {
    if (!pendingCandidatesRef.current.length) return;
    const queued = pendingCandidatesRef.current.splice(0);
    for (const c of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (err) {
        appendLog(`drain candidate error: ${err}`);
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
        appendLog("queued remote ICE candidate");
      } else {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      appendLog(`addIceCandidate error: ${err}`);
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
      const res = await fetch(POST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
      const data = await res.json().catch(() => ({}));
      appendLog(`POST ${msg.type} -> delivered: ${data.delivered ?? 0}`);
    } catch (e: any) {
      appendLog(`POST error: ${e?.message || e}`);
    }
  };

  const setupPeerConnection = async () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.oniceconnectionstatechange = () => {
      appendLog(`iceConnectionState=${pc.iceConnectionState}`);
    };
    pc.onconnectionstatechange = () => {
      appendLog(`connectionState=${pc.connectionState}`);
    };

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
      appendLog(`ontrack: kind=${ev.track.kind}`);
      if (!remoteVideoRef.current) return;
      const [stream] = ev.streams;
      if (stream) {
        remoteVideoRef.current.srcObject = stream;
        safePlay(remoteVideoRef.current);
      }
    };

    const local = await getLocalMediaWithFallback();
    await attachLocalStream(pc, local);

    pcRef.current = pc;
    return pc;
  };

  const subscribeSSE = () => {
    if (esRef.current) esRef.current.close();
    const url = `${SSE_URL}?roomId=${encodeURIComponent(
      roomId
    )}&clientId=${encodeURIComponent(clientId)}`;
    appendLog(`SSE subscribe: ${url}`);
    const es = new EventSource(url, { withCredentials: false });

    es.onopen = () => {
      appendLog("SSE opened");
      setConnected(true);
      const pc = pcRef.current;
      if (
        roleRef.current === "caller" &&
        pc?.localDescription?.type === "offer"
      ) {
        postSignal({
          roomId,
          from: clientId,
          type: "offer",
          payload: pc.localDescription,
        });
        appendLog("re-sent offer after SSE open");
      }
    };

    es.onerror = (ev) => {
      appendLog(`SSE error: ${JSON.stringify(ev)}`);
    };

    es.onmessage = async (ev) => {
      try {
        const data: SignalMessage = JSON.parse(ev.data);
        if (!data || !data.type) return;
        if (data.type === "hello") {
          appendLog(`SSE hello from ${data.from || "server"}`);
          return;
        }
        appendLog(`SSE message: ${data.type} from ${data.from}`);

        const pc = pcRef.current;
        if (!pc) return;

        if (data.type === "offer" && roleRef.current === "callee") {
          await applyRemoteDescriptionAndDrain(pc, data.payload);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await postSignal({
            roomId,
            from: clientId,
            type: "answer",
            payload: answer,
          });
        } else if (data.type === "answer" && roleRef.current === "caller") {
          await applyRemoteDescriptionAndDrain(pc, data.payload);
        } else if (data.type === "candidate") {
          await queueOrAddCandidate(pc, data.payload);
        }
      } catch (e) {
        appendLog(`onmessage parse error: ${e}`);
      }
    };

    esRef.current = es;
  };

  const connect = async (as: Role) => {
    try {
      roleRef.current = as; // ensure immediate consistency
      setRole(as);
      pendingCandidatesRef.current = [];
      appendLog(`connect as ${as}, room=${roomId}, id=${clientId}`);
      await setupPeerConnection();
      subscribeSSE();

      if (as === "caller") {
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
    } catch (e: any) {
      appendLog(`connect error: ${e?.message || e}`);
    }
  };

  const disconnect = () => {
    esRef.current?.close();
    esRef.current = null;
    setConnected(false);

    const pc = pcRef.current;
    if (pc) {
      pc.getSenders().forEach((s) => {
        try {
          s.track?.stop();
        } catch {}
      });
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
      pcRef.current = null;
    }

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
    appendLog("disconnected");
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
          <Stack gap="sm">
            <Group align="flex-end" wrap="wrap">
              <TextInput
                label="房间 ID"
                description="双方需使用相同的房间 ID 才可建立连接"
                value={roomId}
                onChange={(e) => setRoomId(e.currentTarget.value)}
                placeholder="输入房间 ID（如：demo-room）"
                style={{ minWidth: 260, flex: 1 }}
                aria-label="房间 ID"
              />
              <Group gap="xs" wrap="wrap">
                <Button
                  onClick={() => connect("caller")}
                  disabled={!clientIdReady || connected}
                  leftSection={<IconPhoneCall size={16} />}
                >
                  连接（发起方）
                </Button>
                <Button
                  onClick={() => connect("callee")}
                  disabled={!clientIdReady || connected}
                  variant="light"
                  leftSection={<IconPhone size={16} />}
                >
                  连接（接听方）
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
              </Group>
            </Group>

            <Group justify="space-between" wrap="wrap">
              <Group gap={6}>
                <Text size="sm" c="dimmed">
                  客户端 ID:
                </Text>
                <Text size="sm" c="dimmed">
                  {clientIdReady ? clientId : "生成中..."}
                </Text>
                <CopyButton value={clientId} timeout={1000}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? "已复制" : "复制客户端ID"}>
                      <ActionIcon
                        variant={copied ? "filled" : "light"}
                        color={copied ? "teal" : "gray"}
                        onClick={copy}
                        aria-label="复制客户端ID"
                      >
                        {copied ? "✓" : "⧉"}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
              {role === "caller" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const pc = pcRef.current;
                    if (pc?.localDescription?.type === "offer") {
                      postSignal({
                        roomId,
                        from: clientId,
                        type: "offer",
                        payload: pc.localDescription,
                      });
                      appendLog("手动重发 Offer");
                    } else {
                      appendLog(
                        "当前没有可重发的 Offer（请先作为 Caller 建连）"
                      );
                    }
                  }}
                  disabled={!connected}
                  aria-label="手动重发 Offer"
                >
                  重发 Offer
                </Button>
              )}
            </Group>
          </Stack>
        </Paper>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Paper p="sm" withBorder radius="md">
            <Text fw={500} mb={4} component="h3" style={{ lineHeight: 1.2 }}>
              本地流
            </Text>
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
            <Text fw={500} mb={4} component="h3" style={{ lineHeight: 1.2 }}>
              远端流
            </Text>
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

        <Paper p="sm" withBorder radius="md">
          <Group justify="space-between" align="center" mb={8}>
            <Text fw={500} component="h3" style={{ lineHeight: 1.2 }}>
              日志
            </Text>
            <Button
              size="xs"
              variant="subtle"
              onClick={clearLogs}
              aria-label="清空日志"
            >
              清空日志
            </Button>
          </Group>
          <Divider mb="xs" />
          <Stack
            gap={4}
            style={{ maxHeight: 260, overflowY: "auto" }}
            role="log"
            aria-live="polite"
          >
            {log.map((l, i) => (
              <Text
                key={i}
                size="xs"
                c="dimmed"
                style={{ wordBreak: "break-word" }}
              >
                {l}
              </Text>
            ))}
            {log.length === 0 && (
              <Text size="xs" c="dimmed">
                暂无日志
              </Text>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
