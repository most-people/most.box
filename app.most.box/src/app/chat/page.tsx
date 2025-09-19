"use client";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";
import { api } from "@/constants/api";
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
  Box,
  Card,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconPhoneOff,
  IconPhonePlus,
  IconMicrophone,
  IconMicrophoneOff,
  IconVideo,
  IconVideoOff,
} from "@tabler/icons-react";
import { useRef, useState, useEffect } from "react";
import IPv6 from "@/assets/docs/IPv6.md";
import { useUserStore } from "@/stores/userStore";
import { useMarkdown } from "@/hooks/useMarkdown";
import mp from "@/constants/mp";

type Role = "joiner" | "creator";

type SignalMessage = {
  from: string;
  type:
    | "offer"
    | "answer"
    | "candidate"
    | "hello"
    | "closing"
    | "join"
    | "leave";
  payload?: any;
  message?: string;
  clientId?: string;
  ts?: number;
};

export default function PageChat() {
  const [clientId, setClientId] = useState("");
  const [roomId, setRoomId] = useState<string>("001");
  const [role, setRole] = useState<Role | null>(null);
  const [connected, setConnected] = useState(false);

  const [p2pConnected, setP2pConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>("new");
  const [iceConnectionState, setIceConnectionState] = useState<string>("new");
  const [connectionStats, setConnectionStats] = useState<any>(null);
  // 本地音视频开关状态
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
  // const [hasMic, setHasMic] = useState<boolean>(false);
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const esRef = useRef<EventSource | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const roleRef = useRef<Role | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const messagesBoxRef = useRef<HTMLDivElement | null>(null);

  const [chatReady, setChatReady] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { id: number; from: string; text: string; ts: number; self: boolean }[]
  >([]);
  const [chatInput, setChatInput] = useState("");

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
    if (id !== url.searchParams.get("id")) {
      url.searchParams.set("id", id);
      window.history.replaceState({}, "", url.href);
    }
  };

  const statusText = connected
    ? `已${role ? `${role === "creator" ? "创建" : "加入"}` : ""}`
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

    // 初始化本地设备状态
    const a = stream.getAudioTracks();
    const v = stream.getVideoTracks();
    // setHasMic(a.length > 0);
    setHasCamera(v.length > 0);
    setIsMicOn(a.length > 0 ? a.every((t) => t.enabled) : false);
    setIsCameraOn(v.length > 0 ? v.every((t) => t.enabled) : false);
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
      await fetch(`${api.getUri()}/api.signaling`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
    } catch (err) {
      console.info("发送信号失败", err);
    }
  };

  // ---- 文本聊天（DataChannel）----
  const appendChatMessage = (from: string, text: string, self = false) => {
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), from, text, ts: Date.now(), self },
    ]);
  };

  const setupDataChannel = (ch: RTCDataChannel) => {
    dataChannelRef.current = ch;
    ch.onopen = () => {
      setChatReady(true);
      notifications.show({ message: "文字通道已建立", color: "green" });
    };
    ch.onmessage = (ev) => {
      const text = typeof ev.data === "string" ? ev.data : "[非文本消息]";
      appendChatMessage("远端", text, false);
    };
    ch.onclose = () => {
      setChatReady(false);
      notifications.show({ message: "文字通道已关闭", color: "orange" });
    };
    ch.onerror = () => {
      notifications.show({ message: "文字通道出错", color: "red" });
    };
  };

  const sendChat = () => {
    const ch = dataChannelRef.current;
    const text = chatInput.trim();
    if (!text) return;
    if (!ch || ch.readyState !== "open") {
      notifications.show({ message: "通道未就绪，无法发送", color: "orange" });
      return;
    }
    ch.send(text);
    appendChatMessage("本地", text, true);
    setChatInput("");
  };

  useEffect(() => {
    // 自动滚动到底部
    const el = messagesBoxRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [chatMessages]);

  const fetchRoomUsers = async () => {
    try {
      const res = await api.get(`/api.room`, {
        params: {
          roomId,
        },
      });
      if (res.data.ok) {
        return res.data.users as string[];
      }
    } catch (err) {
      console.info("获取房间用户失败", err);
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
      console.log("ICE 连接状态变化:", state);

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

    pc.ondatachannel = (ev) => {
      const ch = ev.channel;
      setupDataChannel(ch);
    };

    const existing = localStreamRef.current;
    const local = existing || (await getLocalMediaWithFallback());
    if (local) {
      if (existing) {
        if (localVideoRef.current && !localVideoRef.current.srcObject) {
          localVideoRef.current.srcObject = local;
          await safePlay(localVideoRef.current);
        }
        local.getTracks().forEach((t) => pc.addTrack(t, local));
        const a = local.getAudioTracks();
        const v = local.getVideoTracks();
        // setHasMic(a.length > 0);
        setHasCamera(v.length > 0);
        setIsMicOn(a.length > 0 ? a.every((t) => t.enabled) : false);
        setIsCameraOn(v.length > 0 ? v.every((t) => t.enabled) : false);
      } else {
        await attachLocalStream(pc, local);
      }
    }

    pcRef.current = pc;
    return pc;
  };

  const subscribeSSE = () => {
    if (esRef.current) esRef.current.close();
    const url = new URL(api.getUri());
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

        // 处理用户加入房间
        if (data.type === "join") {
          notifications.show({
            message: data.clientId + " 加入房间",
            color: "blue",
          });
          return;
        }

        // 处理用户离开房间
        if (data.type === "leave") {
          notifications.show({
            message: data.clientId + " 离开房间",
            color: "blue",
          });

          if (roleRef.current === "joiner") {
            disconnect();
          }
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
      const users = await fetchRoomUsers();

      if (!users) {
        notifications.show({
          message: "获取房间用户失败",
          color: "red",
        });
        return;
      }

      if (users.length >= 2) {
        notifications.show({
          message: "房间已满，试试更换房间 ID",
          color: "red",
        });
        return;
      }

      const role = users.length === 0 ? "creator" : "joiner";

      roleRef.current = role;

      pendingCandidatesRef.current = [];

      await setupPeerConnection();

      setRole(role);
      subscribeSSE();

      if (role === "joiner") {
        const pc = pcRef.current!;
        // 先创建数据通道，再创建 offer
        const ch = pc.createDataChannel("chat", { ordered: true });
        setupDataChannel(ch);

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

    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close();
      } catch {}
      dataChannelRef.current = null;
    }
    setChatReady(false);

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
      pc.ondatachannel = null;
      pc.close();
      pcRef.current = null;
    }

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];

    // 重置本地设备状态
    // setHasMic(false);
    setHasCamera(false);
    setIsMicOn(false);
    setIsCameraOn(false);
  };

  const markdown = useMarkdown();
  const ipv6Element = useRef<HTMLDivElement>(null);
  const nodeDark = useUserStore((state) => state.nodeDark);
  const init = async () => {
    if (ipv6Element.current) {
      const viewer = await markdown.initViewer(ipv6Element.current);
      viewer.setMarkdown(IPv6);
    }
  };

  useEffect(() => {
    const uuid = Math.random().toString(36).slice(2, 10).toUpperCase();
    setClientId(uuid);

    const id = new URLSearchParams(window.location.search).get("id");
    setRoomId(id || roomId);
    updateRoomId(id || roomId);

    init();

    return () => {
      disconnect();
    };
  }, []);

  // ---- 音视频开关 ----
  const toggleMic = async () => {
    let stream = localStreamRef.current;
    if (!stream) {
      const newStream = await getLocalMediaWithFallback();
      if (!newStream) return;
      localStreamRef.current = newStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
        await safePlay(localVideoRef.current);
      }
      const a = newStream.getAudioTracks();
      const v = newStream.getVideoTracks();
      // setHasMic(a.length > 0);
      setHasCamera(v.length > 0);
      setIsMicOn(a.length > 0 ? a.every((t) => t.enabled) : false);
      setIsCameraOn(v.length > 0 ? v.every((t) => t.enabled) : false);
      stream = newStream;
    }

    const tracks = stream.getAudioTracks();
    if (!tracks.length) {
      notifications.show({ message: "未检测到麦克风", color: "orange" });
      return;
    }
    const next = !isMicOn;
    tracks.forEach((t) => (t.enabled = next));
    setIsMicOn(next);
  };

  const toggleCamera = async () => {
    let stream = localStreamRef.current;
    if (!stream) {
      const newStream = await getLocalMediaWithFallback();
      if (!newStream) return;
      localStreamRef.current = newStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
        await safePlay(localVideoRef.current);
      }
      const a = newStream.getAudioTracks();
      const v = newStream.getVideoTracks();
      // setHasMic(a.length > 0);
      setHasCamera(v.length > 0);
      setIsMicOn(a.length > 0 ? a.every((t) => t.enabled) : false);
      setIsCameraOn(v.length > 0 ? v.every((t) => t.enabled) : false);
      stream = newStream;
    }

    const tracks = stream.getVideoTracks();
    if (!tracks.length) {
      notifications.show({ message: "未检测到摄像头", color: "orange" });
      return;
    }
    const next = !isCameraOn;
    tracks.forEach((t) => (t.enabled = next));
    setIsCameraOn(next);
  };

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
                    onClick={() => connect()}
                    disabled={!clientId}
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
                <Text size="sm">WebRTC 连接状态:</Text>
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
                <Text size="sm">ICE 连接状态:</Text>
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
                💡 提示: 如果长时间无法建立 P2P 连接，请检查网络 IPv6
                配置或尝试重新连接
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
                  延迟
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
            <Box style={{ position: "relative" }}>
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
              {hasCamera && !isCameraOn && (
                <Center
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 8,
                    backgroundColor: "var(--mantine-color-gray-light)",
                  }}
                >
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      摄像头已关闭
                    </Text>
                  </Group>
                </Center>
              )}
            </Box>
            <Group justify="center" mt="xs" gap="xs">
              <Tooltip label={isMicOn ? "关闭麦克风" : "开启麦克风"}>
                <Button
                  size="xs"
                  variant={isMicOn ? "light" : "filled"}
                  color={isMicOn ? "green" : "gray"}
                  onClick={toggleMic}
                  disabled={false}
                  aria-pressed={isMicOn}
                  leftSection={
                    isMicOn ? (
                      <IconMicrophone size={16} />
                    ) : (
                      <IconMicrophoneOff size={16} />
                    )
                  }
                >
                  麦克风
                </Button>
              </Tooltip>
              <Tooltip label={isCameraOn ? "关闭摄像头" : "开启摄像头"}>
                <Button
                  size="xs"
                  variant={isCameraOn ? "light" : "filled"}
                  color={isCameraOn ? "green" : "gray"}
                  onClick={toggleCamera}
                  disabled={false}
                  aria-pressed={isCameraOn}
                  leftSection={
                    isCameraOn ? (
                      <IconVideo size={16} />
                    ) : (
                      <IconVideoOff size={16} />
                    )
                  }
                >
                  摄像头
                </Button>
              </Tooltip>
            </Group>
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

        <Paper p="md" withBorder radius="md">
          <Group justify="space-between" align="center" mb="sm">
            <Text fw={500}>聊天</Text>
            <Badge variant="light" color={chatReady ? "green" : "gray"}>
              {chatReady ? "可发送" : "未就绪"}
            </Badge>
          </Group>

          <Box
            ref={messagesBoxRef}
            style={{
              height: 240,
              overflowY: "auto",
              backgroundColor: "var(--mantine-color-gray-light)",
              borderRadius: 6,
              padding: 8,
            }}
          >
            {chatMessages.length === 0 ? (
              <Center c="dimmed" h={220}>
                <Text size="sm">
                  暂无消息，{connected ? "开始聊天吧" : "请先加入建立连接"}
                </Text>
              </Center>
            ) : (
              <Stack gap={6}>
                {chatMessages.map((m) => (
                  <Box
                    key={m.id}
                    style={{
                      maxWidth: "75%",
                      marginLeft: m.self ? "auto" : 0,
                      marginRight: m.self ? 0 : "auto",
                      backgroundColor: m.self
                        ? "var(--mantine-color-blue-light)"
                        : "white",
                      border: "1px solid var(--mantine-color-gray-3)",
                      borderRadius: 8,
                      padding: 8,
                      textAlign: m.self ? "right" : "left",
                    }}
                    aria-label={`${m.from} 的消息`}
                    title={mp.formatDate(m.ts)}
                  >
                    <Text size="xs" c="dimmed">
                      {m.from} {mp.formatDate(m.ts)}
                    </Text>
                    <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                      {m.text}
                    </Text>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          <Group align="flex-end" mt="sm" wrap="wrap">
            <Textarea
              placeholder={
                chatReady
                  ? "输入消息 Enter 发送 Shift+Enter 换行"
                  : "文字通道未就绪"
              }
              value={chatInput}
              onChange={(e) => setChatInput(e.currentTarget.value)}
              autosize
              minRows={1}
              maxRows={3}
              style={{ flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
            />
            <Group gap="xs">
              <Button
                onClick={sendChat}
                disabled={!chatReady || !chatInput.trim()}
              >
                发送
              </Button>
            </Group>
          </Group>
        </Paper>

        <Card withBorder>
          <Box className={nodeDark} ref={ipv6Element} />
        </Card>
      </Stack>
    </Container>
  );
}
