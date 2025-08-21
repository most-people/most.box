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
} from "@mantine/core";
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
  const [clientId] = useState<string>(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Math.random()).slice(2)
  );
  const [role, setRole] = useState<Role | null>(null);
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);

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

  // ---- Helpers ----
  const safePlay = async (el: HTMLVideoElement | null) => {
    if (!el) return;
    try {
      await el.play();
    } catch (e) {
      appendLog(`video play blocked: ${e}`);
    }
  };

  const attachLocalStream = async (pc: RTCPeerConnection, stream: MediaStream) => {
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
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
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
        postSignal({ roomId, from: clientId, type: "candidate", payload: event.candidate });
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
    const url = `${SSE_URL}?roomId=${encodeURIComponent(roomId)}&clientId=${encodeURIComponent(clientId)}`;
    appendLog(`SSE subscribe: ${url}`);
    const es = new EventSource(url, { withCredentials: false });

    es.onopen = () => {
      appendLog("SSE opened");
      setConnected(true);
      const pc = pcRef.current;
      if (roleRef.current === "caller" && pc?.localDescription?.type === "offer") {
        postSignal({ roomId, from: clientId, type: "offer", payload: pc.localDescription });
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
          await postSignal({ roomId, from: clientId, type: "answer", payload: answer });
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
        await postSignal({ roomId, from: clientId, type: "offer", payload: offer });
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
        try { s.track?.stop(); } catch {}
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

  return (
    <Container py="md">
      <AppHeader title="WebRTC Demo (HTTP + SSE)" />

      <Stack gap="md">
        <Title order={3}>WebRTC Demo - HTTP + SSE</Title>
        <Group align="center">
          <TextInput
            label="房间 ID"
            value={roomId}
            onChange={(e) => setRoomId(e.currentTarget.value)}
            placeholder="请输入房间 ID（让双方一致）"
            style={{ minWidth: 260 }}
          />
          <Button onClick={() => connect("caller")} disabled={connected}>
            作为 Caller 建连
          </Button>
          <Button onClick={() => connect("callee")} disabled={connected}>
            作为 Callee 等待
          </Button>
          <Button color="red" variant="light" onClick={disconnect}>
            断开
          </Button>
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
                  appendLog("当前没有可重发的 Offer（请先作为 Caller 建连）");
                }
              }}
            >
              重发 Offer
            </Button>
          )}
        </Group>

        <Group align="flex-start" grow>
          <Paper p="sm" withBorder>
            <Text fw={500} mb={4}>
              本地流
            </Text>
            <video
              ref={localVideoRef}
              playsInline
              autoPlay
              muted
              style={{ width: 320 }}
            />
          </Paper>
          <Paper p="sm" withBorder>
            <Text fw={500} mb={4}>
              远端流
            </Text>
            <video
              ref={remoteVideoRef}
              playsInline
              autoPlay
              style={{ width: 320 }}
            />
          </Paper>
        </Group>

        <Paper p="sm" withBorder>
          <Text fw={500} mb={8}>
            日志
          </Text>
          <Stack gap={4} style={{ maxHeight: 240, overflowY: "auto" }}>
            {log.map((l, i) => (
              <Text key={i} size="xs" c="dimmed">
                {l}
              </Text>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
