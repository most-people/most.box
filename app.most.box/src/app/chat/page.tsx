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
import { IconPhoneOff, IconPhonePlus } from "@tabler/icons-react";
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

  const [p2pConnected, setP2pConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>("new");
  const [iceConnectionState, setIceConnectionState] = useState<string>("new");
  const [connectionStats, setConnectionStats] = useState<any>(null);

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

  // 定期检查P2P连接状态
  useEffect(() => {
    if (!connected || !pcRef.current) return;

    const checkInterval = setInterval(() => {
      const pc = pcRef.current;
      if (pc) {
        const currentConnectionState = pc.connectionState;
        const currentIceState = pc.iceConnectionState;

        // 更新状态（如果有变化）
        if (currentConnectionState !== connectionState) {
          setConnectionState(currentConnectionState);
        }
        if (currentIceState !== iceConnectionState) {
          setIceConnectionState(currentIceState);
        }

        // 检查P2P连接状态
        const isP2PConnected =
          currentConnectionState === "connected" &&
          (currentIceState === "connected" || currentIceState === "completed");

        if (isP2PConnected !== p2pConnected) {
          setP2pConnected(isP2PConnected);
        }
      }
    }, 2000); // 每2秒检查一次

    return () => clearInterval(checkInterval);
  }, [connected, connectionState, iceConnectionState, p2pConnected]);

  const updateRoomId = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("id", id);
    window.history.replaceState({}, "", url.href);
  };

  const statusText = connected
    ? `已连接${role ? `（${role === "creator" ? "创建者" : "加入者"}）` : ""}`
    : "未连接";
  const statusColor: any = connected ? "green" : "gray";

  const p2pStatusText = p2pConnected ? "P2P已连接" : "P2P未连接";
  const p2pStatusColor: any = p2pConnected
    ? "green"
    : connectionState === "connecting"
    ? "yellow"
    : "gray";

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

  const getConnectionStats = async () => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      const stats = await pc.getStats();
      const statsData: any = {};

      stats.forEach((report) => {
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          statsData.candidatePair = {
            bytesReceived: report.bytesReceived,
            bytesSent: report.bytesSent,
            currentRoundTripTime: report.currentRoundTripTime,
            availableOutgoingBitrate: report.availableOutgoingBitrate,
          };
        }
        if (report.type === "inbound-rtp" && report.mediaType === "video") {
          statsData.inboundVideo = {
            bytesReceived: report.bytesReceived,
            packetsReceived: report.packetsReceived,
            packetsLost: report.packetsLost,
            framesDecoded: report.framesDecoded,
          };
        }
        if (report.type === "outbound-rtp" && report.mediaType === "video") {
          statsData.outboundVideo = {
            bytesSent: report.bytesSent,
            packetsSent: report.packetsSent,
            framesEncoded: report.framesEncoded,
          };
        }
      });

      setConnectionStats(statsData);
      console.log("连接统计信息:", statsData);
    } catch (err) {
      console.error("获取连接统计失败:", err);
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

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      setIceConnectionState(state);
      console.log("ICE连接状态变化:", state);

      // ICE连接状态检查
      if (state === "connected" || state === "completed") {
        setP2pConnected(true);
        notifications.show({
          message: "P2P 连接已建立！",
          color: "green",
        });
      } else if (state === "disconnected" || state === "failed") {
        setP2pConnected(false);
        if (state === "failed") {
          notifications.show({
            message: "P2P 连接失败，请重试",
            color: "red",
          });
        }
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setConnectionState(state);
      console.log("连接状态变化:", state);

      // 连接状态检查
      if (state === "connected") {
        setP2pConnected(true);
        notifications.show({
          message: "WebRTC 连接已建立！",
          color: "green",
        });
      } else if (state === "disconnected" || state === "failed") {
        setP2pConnected(false);
        if (state === "failed") {
          notifications.show({
            message: "WebRTC 连接失败",
            color: "red",
          });
        }
      } else if (state === "connecting") {
        notifications.show({
          message: "正在建立 P2P 连接...",
          color: "blue",
        });
      }
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

  const connect = async (as: Role) => {
    try {
      // 默认设置为创建者角色，实际角色会在信令交换过程中确定

      roleRef.current = as; // ensure immediate consistency

      pendingCandidatesRef.current = [];

      await setupPeerConnection();

      setRole(as);
      subscribeSSE();

      // 创建offer并发送，如果房间里已有人会收到answer
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

  const disconnect = async () => {
    esRef.current?.close();
    esRef.current = null;
    setConnected(false);
    setRole(null);
    setP2pConnected(false);
    setConnectionState("new");
    setIceConnectionState("new");
    setConnectionStats(null);

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
      disconnect();
    };
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    updateRoomId(id || roomId);
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
                color={p2pStatusColor}
                variant="light"
                aria-label="P2P 连接状态"
              >
                {p2pStatusText}
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
                </>
              ) : (
                <>
                  <Button
                    onClick={() => connect("creator")}
                    disabled={!clientId || connected}
                    leftSection={<IconPhonePlus size={16} />}
                    color="blue"
                    variant="light"
                  >
                    创建
                  </Button>
                  <Button
                    onClick={() => connect("joiner")}
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

        {connected && (
          <Paper p="md" withBorder radius="md">
            <Group justify="space-between" align="center" mb="sm">
              <Text fw={500}>连接状态详情</Text>
              <Badge variant="light" color={p2pStatusColor}>
                {p2pConnected ? "已连接" : "未连接"}
              </Badge>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Group
                justify="space-between"
                p="xs"
                style={{
                  backgroundColor: "var(--mantine-color-gray-light)",
                  borderRadius: 4,
                }}
              >
                <Text size="sm">WebRTC连接状态:</Text>
                <Badge
                  size="sm"
                  color={
                    connectionState === "connected"
                      ? "green"
                      : connectionState === "connecting"
                      ? "yellow"
                      : "gray"
                  }
                >
                  {connectionState}
                </Badge>
              </Group>
              <Group
                justify="space-between"
                p="xs"
                style={{
                  backgroundColor: "var(--mantine-color-gray-light)",
                  borderRadius: 4,
                }}
              >
                <Text size="sm">ICE连接状态:</Text>
                <Badge
                  size="sm"
                  color={
                    iceConnectionState === "connected" ||
                    iceConnectionState === "completed"
                      ? "green"
                      : iceConnectionState === "checking"
                      ? "yellow"
                      : "gray"
                  }
                >
                  {iceConnectionState}
                </Badge>
              </Group>
            </SimpleGrid>
            {!p2pConnected && connected && (
              <Text size="sm" c="dimmed" mt="sm">
                💡 提示:
                如果长时间无法建立P2P连接，请检查网络防火墙设置或尝试重新连接
              </Text>
            )}
            {p2pConnected && (
              <Group mt="sm" gap="xs">
                <Button
                  size="xs"
                  variant="light"
                  color="blue"
                  onClick={getConnectionStats}
                >
                  获取连接统计
                </Button>
                {connectionStats && (
                  <Text size="xs" c="dimmed">
                    RTT:{" "}
                    {connectionStats.candidatePair?.currentRoundTripTime
                      ? `${(
                          connectionStats.candidatePair.currentRoundTripTime *
                          1000
                        ).toFixed(0)}ms`
                      : "失败"}
                  </Text>
                )}
              </Group>
            )}
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
