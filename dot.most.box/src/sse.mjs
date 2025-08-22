// SSE rooms: roomId -> Set<{ id: string, send: (data:any)=>void, res: ServerResponse }>
const rooms = new Map();

// ---- SSE helpers (deduplicated) ----
const makeSSESender = (rawRes) => (obj) => {
  try {
    rawRes.write(`data: ${JSON.stringify(obj)}\n\n`);
  } catch (_) {
    // ignore write errors
  }
};
const broadcastToRoom = (roomId, message, { excludeId, toId } = {}) => {
  const set = rooms.get(roomId);
  if (!set || set.size === 0) return 0;
  let delivered = 0;
  set.forEach((client) => {
    if (excludeId && client.id === String(excludeId)) return;
    if (toId && client.id !== String(toId)) return;
    client.send(message);
    delivered++;
  });
  return delivered;
};

// ============ HTTP + SSE 信令 ============
export const registerSSE = (server) => {
  // 订阅房间消息 SSE
  server.get("/sse.signaling", (request, reply) => {
    try {
      const { roomId, clientId } = request.query || {};
      if (!roomId || !clientId) {
        reply.code(400);
        reply.send({ ok: false, message: "roomId 和 clientId 必填" });
        return;
      }

      // SSE 必要响应头
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("Access-Control-Allow-Origin", "*");
      reply.raw.flushHeaders?.();

      // 写入工具
      const send = makeSSESender(reply.raw);

      // 加入房间
      let set = rooms.get(roomId);
      if (!set) {
        set = new Set();
        rooms.set(roomId, set);
      }

      const client = { id: String(clientId), send, res: reply.raw };
      set.add(client);
      // console.log(`[SSE] client ${clientId} joined room ${roomId}, size=${set.size}`);

      // 初次问候
      send({ type: "hello", roomId, clientId, ts: Date.now() });

      // 心跳保持
      const heartbeat = setInterval(() => {
        try {
          reply.raw.write(`: ping ${Date.now()}\n\n`);
        } catch {}
      }, 15000);

      // 断开清理
      request.raw.on("close", () => {
        clearInterval(heartbeat);
        const s = rooms.get(roomId);
        if (s) {
          s.delete(client);
          if (s.size === 0) rooms.delete(roomId);
        }
        // console.log(`[SSE] client ${clientId} left room ${roomId}`);
      });
    } catch (error) {
      // console.error("[SSE] subscribe error:", error);
      reply.code(500).send({ ok: false, message: error.message });
    }
  });

  // 获取房间用户列表 HTTP
  server.get("/api.room", async (request, reply) => {
    try {
      const { roomId } = request.query || {};

      if (!roomId) {
        reply.code(400);
        return { ok: false, message: "roomId 必填" };
      }

      const set = rooms.get(roomId);
      const users = set ? Array.from(set).map((client) => client.id) : [];

      return { ok: true, users };
    } catch (error) {
      // console.error("[SSE] get room users error:", error);
      reply.code(500);
      return { ok: false, message: error.message };
    }
  });

  // 发送信令 HTTP
  server.post("/api.signaling", async (request, reply) => {
    try {
      const { roomId, from, to, type, payload } = request.body || {};

      if (!roomId || !from || !type) {
        reply.code(400);
        return { ok: false, message: "roomId, from, type 必填" };
      }

      const message = { from, type, payload, ts: Date.now() };
      const delivered = broadcastToRoom(roomId, message, {
        excludeId: from,
        toId: to,
      });

      return { ok: true, delivered };
    } catch (error) {
      // console.error("[SSE] post signaling error:", error);
      reply.code(500);
      return { ok: false, message: error.message };
    }
  });
};
