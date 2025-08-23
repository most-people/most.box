"use client";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";
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
import {
  IconPhoneOff,
  IconPhonePlus,
  IconPhoneRinging,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";

type Role = "joiner" | "creator";

type SignalMessage = {
  from: string;
  type: "offer" | "answer" | "candidate" | "connected" | "closing";
  payload?: any;
  message?: string;
  ts?: number;
};

export default function PageChat() {
  const dotAPI = useUserStore((state) => state.dotAPI);
  const wallet = useUserStore((state) => state.wallet);
  const clientId = wallet ? wallet.address : "";

  const [roomId, setRoomId] = useState<string>("001");
  const [role, setRole] = useState<Role | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomUsers, setRoomUsers] = useState<string[]>([]);

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

  const updateRoomId = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("id", id);
    window.history.replaceState({}, "", url.href);
  };

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

  const fetchRoomUsers = async () => {
    try {
      const response = await fetch(
        `${dotAPI}/api.room?roomId=${encodeURIComponent(roomId)}`
      );
      const data = await response.json();
      if (data.ok) {
        setRoomUsers(data.users || []);
        return data.users || [];
      }
      return [];
    } catch (err) {
      console.info("获取房间用户失败", err);
      return [];
    }
  };

  const setupPeerConnection = async () => {
    // STUN 服务器测试 https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun.nextcloud.com:443" },
        { urls: "stun:stun.freeswitch.org:3478" },
      ],
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
      // 立即获取房间用户列表
      fetchRoomUsers();
      // 每5秒更新一次用户列表
      const userListInterval = setInterval(fetchRoomUsers, 5000);
      // 保存interval引用以便清理
      (es as any).userListInterval = userListInterval;

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

        if (data.type === "connected") {
          return;
        }

        // 处理房间关闭消息
        if (data.type === "closing") {
          notifications.show({
            message: data.message || "房间已关闭",
            color: "orange",
          });
          disconnect();
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
        console.info(err);
      }
    };

    esRef.current = es;
  };

  const connect = async () => {
    try {
      // 先获取最新的房间用户列表
      const currentUsers = await fetchRoomUsers();

      // 检查 clientId 是否已存在于房间中
      if (currentUsers.includes(clientId)) {
        notifications.show({
          message: "您已在房间中，无法重复加入",
          color: "orange",
        });
        return;
      }

      // 根据房间内是否有人来决定角色
      const as: Role = currentUsers.length > 0 ? "joiner" : "creator";

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
    } catch (err) {
      console.info("连接失败", err);
    }
  };

  const disconnect = () => {
    // 清理用户列表定时器
    if (esRef.current && (esRef.current as any).userListInterval) {
      clearInterval((esRef.current as any).userListInterval);
    }
    esRef.current?.close();
    esRef.current = null;
    setConnected(false);
    setRole(null);
    setRoomUsers([]);

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
    updateRoomId(roomId);
  }, []);

  return (
    <Container py="md">
      <AppHeader title="点对点聊天" />
      <Stack gap="md">
        <Center>
          <Icon name="Chat" size={40} />
        </Center>
        <Group justify="space-between" align="center">
          <Title size="h2">WebRTC + HTTP + SSE</Title>
          <Group gap="sm">
            <Badge
              size="lg"
              color={statusColor}
              variant="light"
              aria-live="polite"
              aria-atomic
            >
              {statusText}
            </Badge>
            {connected && (
              <Badge
                size="lg"
                color="blue"
                variant="light"
                aria-label="房间用户数量"
              >
                {roomUsers.length} 人在线
              </Badge>
            )}
          </Group>
        </Group>

        <Paper p="md" withBorder radius="md">
          <Group align="flex-end" wrap="wrap" justify="space-between">
            <TextInput
              label="房间 ID"
              description="使用相同的房间 ID 才可建立连接"
              value={roomId}
              onChange={(e) => {
                updateRoomId(e.currentTarget.value);
                setRoomId(e.currentTarget.value);
              }}
              placeholder="输入房间 ID"
              flex={1}
              miw={280}
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
              {connected ? (
                <>
                  <Button
                    color="red"
                    variant="light"
                    onClick={disconnect}
                    leftSection={<IconPhoneOff size={16} />}
                  >
                    断开
                  </Button>
                  {role === "joiner" && (
                    <Button
                      variant="light"
                      color="blue"
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
                      leftSection={<IconPhoneRinging size={16} />}
                    >
                      重试
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {" "}
                  <Button
                    onClick={() => connect()}
                    disabled={!clientId || connected}
                    leftSection={<IconPhonePlus size={16} />}
                    color="blue"
                    variant="light"
                  >
                    加入
                  </Button>
                </>
              )}
            </Group>
          </Group>
        </Paper>

        {!wallet && (
          <Center>
            <Button variant="gradient" component={Link} href="/login">
              去登录
            </Button>
          </Center>
        )}

        {roomUsers.length > 0 && (
          <Paper p="md" withBorder radius="md">
            <Group justify="space-between" align="center" mb="sm">
              <Text fw={500}>房间用户列表</Text>
              <Badge variant="light" color="blue">
                {roomUsers.length} 人
              </Badge>
            </Group>
            <Stack gap="xs">
              {roomUsers.map((user) => (
                <Group
                  key={user}
                  justify="space-between"
                  p="xs"
                  style={{
                    backgroundColor:
                      user === clientId
                        ? "var(--mantine-color-blue-light)"
                        : "var(--mantine-color-gray-light)",
                    borderRadius: 4,
                  }}
                >
                  <Text size="sm" ff="monospace">
                    {user === clientId ? `${user} (我)` : user}
                  </Text>
                  {user === clientId && (
                    <Badge size="xs" color="blue" variant="filled">
                      我
                    </Badge>
                  )}
                </Group>
              ))}
            </Stack>
          </Paper>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Paper p="sm" withBorder radius="md">
            <Center>
              <Text>本地</Text>
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
              }}
            />
          </Paper>
          <Paper p="sm" withBorder radius="md">
            <Center>
              <Text>远端</Text>
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
              }}
            />
          </Paper>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
