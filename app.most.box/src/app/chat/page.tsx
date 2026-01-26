"use client";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";
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
  List,
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
import type { DataConnection, MediaConnection } from "peerjs";
import { useUserStore } from "@/stores/userStore";
import mp from "@/utils/mp";

type Role = "joiner" | "creator";

export default function PageChat() {
  const [clientId, setClientId] = useState("");
  const [roomId, setRoomId] = useState<string>("001");
  const [role, setRole] = useState<Role | null>(null);
  const [connected, setConnected] = useState(false);

  const [p2pConnected, setP2pConnected] = useState(false);
  // 本地音视频开关状态
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
  // const [hasMic, setHasMic] = useState<boolean>(false);
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  // PeerJS refs
  const peerRef = useRef<any>(null);
  // Keep track of active connections
  const mediaConnRef = useRef<any>(null);
  const dataConnRef = useRef<any>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const messagesBoxRef = useRef<HTMLDivElement | null>(null);

  const [chatReady, setChatReady] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { id: number; from: string; text: string; ts: number; self: boolean }[]
  >([]);
  const [chatInput, setChatInput] = useState("");

  // ---- Helpers ----
  const updateRoomId = (id: string) => {
    const url = new URL(window.location.href);
    if (id !== url.searchParams.get("id")) {
      url.searchParams.set("id", id);
      window.history.replaceState({}, "", url.href);
    }
  };

  const safePlay = async (el: HTMLVideoElement | null) => {
    if (!el) return;
    try {
      await el.play();
    } catch (error) {
      console.info("视频播放失败", error);
    }
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

  // ---- 文本聊天（DataChannel）----
  const appendChatMessage = (from: string, text: string, self = false) => {
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), from, text, ts: Date.now(), self },
    ]);
  };

  const sendChat = () => {
    const conn = dataConnRef.current;
    const text = chatInput.trim();
    if (!text) return;
    if (!conn || !conn.open) {
      notifications.show({ message: "通道未就绪，无法发送", color: "orange" });
      return;
    }
    conn.send(text);
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

  // PeerJS setup
  const setupDataConnection = (conn: DataConnection) => {
    dataConnRef.current = conn;
    conn.on("open", () => {
      setChatReady(true);
      notifications.show({ message: "文字通道已建立", color: "green" });
    });
    conn.on("data", (data: any) => {
      const text = typeof data === "string" ? data : JSON.stringify(data);
      appendChatMessage("远端", text, false);
    });
    conn.on("close", () => {
      setChatReady(false);
      notifications.show({ message: "文字通道已关闭", color: "orange" });
    });
    conn.on("error", (err) => {
      console.error("DataConnection error:", err);
      notifications.show({ message: "文字通道出错", color: "red" });
    });
  };

  const setupMediaConnection = (call: MediaConnection) => {
    mediaConnRef.current = call;
    setP2pConnected(true);
    call.on("stream", (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        safePlay(remoteVideoRef.current);
      }
    });
    call.on("close", () => {
      setP2pConnected(false);
      notifications.show({ message: "通话已结束", color: "blue" });
    });
    call.on("error", (err) => {
      console.error("MediaConnection error:", err);
      setP2pConnected(false);
    });
  };

  const initPeer = async (id: string | null = null) => {
    const Peer = (await import("peerjs")).default;
    const peer = id ? new Peer(id) : new Peer();

    peer.on("open", (myId) => {
      setClientId(myId);
      setConnected(true);

      if (id) {
        // We successfully created a peer with roomId -> We are Creator
        setRole("creator");
        notifications.show({ message: "等待对方加入...", color: "blue" });
      } else {
        // Random ID -> We are Joiner
        setRole("joiner");
        // Connect to the room
        const conn = peer.connect(roomId);
        setupDataConnection(conn);

        if (localStreamRef.current) {
          const call = peer.call(roomId, localStreamRef.current);
          setupMediaConnection(call);
        }
      }
    });

    peer.on("connection", (conn) => {
      setupDataConnection(conn);
    });

    peer.on("call", (call) => {
      // Answer with local stream
      const stream = localStreamRef.current;
      if (stream) {
        call.answer(stream);
        setupMediaConnection(call);
      } else {
        // If no local stream, maybe answer audio only or get stream first?
        // For simplicity, answer with empty or get stream
        getLocalMediaWithFallback().then((s) => {
          if (s) {
            localStreamRef.current = s;
            // update UI
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = s;
              safePlay(localVideoRef.current);
            }
            call.answer(s);
            setupMediaConnection(call);
          }
        });
      }
    });

    peer.on("error", (err: any) => {
      console.error("Peer error:", err);
      if (err.type === "unavailable-id") {
        // ID taken, means Room Creator exists. I am Joiner.
        // Recursively call with null to get random ID
        initPeer(null);
      } else {
        notifications.show({
          message: `Peer error: ${err.type}`,
          color: "red",
        });
      }
    });

    peerRef.current = peer;
  };

  const connect = async () => {
    try {
      const stream = await getLocalMediaWithFallback();
      if (!stream) return;

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await safePlay(localVideoRef.current);
      }

      // Initialize local controls
      const a = stream.getAudioTracks();
      const v = stream.getVideoTracks();
      setHasCamera(v.length > 0);
      setIsMicOn(a.length > 0 ? a.every((t) => t.enabled) : false);
      setIsCameraOn(v.length > 0 ? v.every((t) => t.enabled) : false);

      // Try to claim the room ID
      await initPeer(roomId);
    } catch (err) {
      console.info("连接失败", err);
    }
  };

  const disconnect = async () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setConnected(false);
    setRole(null);
    setP2pConnected(false);
    setChatReady(false);

    // Clear chat messages on disconnect
    setChatMessages([]);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    // Reset UI
    setHasCamera(false);
    setIsMicOn(false);
    setIsCameraOn(false);
  };

  const nodeDark = useUserStore((state) => state.nodeDark);

  useEffect(() => {
    const uuid = Math.random().toString(36).slice(2, 10).toUpperCase();
    setClientId(uuid);

    const id = new URLSearchParams(window.location.search).get("id");
    setRoomId(id || roomId);
    updateRoomId(id || roomId);

    return () => {
      disconnect();
    };
  }, []);

  const statusText = connected
    ? `已${role ? `${role === "creator" ? "创建" : "加入"}` : ""}`
    : "未连接";
  const statusColor: any = connected ? "green" : "gray";

  const p2pStatusText = p2pConnected ? "P2P已连接" : "P2P未连接";
  const p2pStatusColor: any = p2pConnected ? "green" : "gray";

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
      <AppHeader title="加密聊天" />
      <Stack gap="md">
        <Center>
          <Icon name="Chat" size={40} />
        </Center>
        <Center>
          <Text size="sm" c="dimmed">
            无需服务器中转，浏览器直接对话
          </Text>
        </Center>
        <Group justify="space-between" align="center">
          <Title size="h2">WebRTC 实时通信</Title>
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
            {!p2pConnected && connected && (
              <Text size="sm" c="dimmed" mt="sm">
                💡 提示: 如果长时间无法建立 P2P 连接，请检查网络 IPv6
                配置或尝试重新连接
              </Text>
            )}
            {p2pConnected && (
              <Group mt="sm" gap="xs">
                <Text size="sm" c="green">
                  P2P 通话中
                </Text>
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

        <Center>
          <Card withBorder padding="lg" radius="md" mt="md">
            <Stack gap="sm">
              <Group>
                <Text size="xl">🚀</Text>
                <div>
                  <Text fw={700}>WebRTC 实时通信</Text>
                  <Text size="sm" c="dimmed">
                    无需服务器中转，浏览器直接对话
                  </Text>
                </div>
              </Group>
              <List spacing="xs" p={0} size="sm" center>
                <List.Item icon={<Text mr={6}>🔒</Text>}>
                  <Text span fw={500}>
                    隐私安全：
                  </Text>
                  点对点加密直连，无中间服务器
                </List.Item>
                <List.Item icon={<Text mr={6}>⚡️</Text>}>
                  <Text span fw={500}>
                    极低延迟：
                  </Text>
                  数据不绕路，延迟低至毫秒级
                </List.Item>
                <List.Item icon={<Text mr={6}>🌐</Text>}>
                  <Text span fw={500}>
                    开源透明：
                  </Text>
                  基于 PeerJS，WebRTC 协议
                </List.Item>
              </List>
            </Stack>
          </Card>
        </Center>
      </Stack>
    </Container>
  );
}
