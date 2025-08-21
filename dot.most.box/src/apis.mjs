import mp from "./mp.mjs";
import rng from "rdrand-lite";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);
const isRdrandSupported = rng.isRrdrandSupported();

// SSE rooms: roomId -> Set<{ id: string, send: (data:any)=>void, res: ServerResponse }>
const rooms = new Map();

// ---- SSE helpers (deduplicated) ----
const setSSEHeaders = (reply) => {
  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache");
  reply.raw.setHeader("Connection", "keep-alive");
  reply.raw.setHeader("Access-Control-Allow-Origin", "*");
  reply.raw.flushHeaders?.();
};

const makeSSESender = (rawRes) => (obj) => {
  try {
    rawRes.write(`data: ${JSON.stringify(obj)}\n\n`);
  } catch (_) {
    // ignore write errors
  }
};

const getOrCreateRoom = (roomId) => {
  let set = rooms.get(roomId);
  if (!set) {
    set = new Set();
    rooms.set(roomId, set);
  }
  return set;
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

const validateSignalBody = ({ roomId, from, type }) => {
  if (!roomId) return "roomId 必填";
  if (!from) return "from 必填";
  if (!type) return "type 必填";
  return null;
};

/**
 * 注册 API 相关的路由
 * @param {import('fastify').FastifyInstance} server - Fastify 服务器实例
 * @param {string} __dirname - 项目根目录
 */
export const registerApis = (server, __dirname) => {
  // 节点信息
  server.get("/api.dot", async () => {
    return mp.getIP();
  });

  // ============ HTTP + SSE 信令 ============
  // 订阅房间消息（SSE）
  server.get("/api.signaling/sse", (request, reply) => {
    try {
      const { roomId, clientId } = request.query || {};
      if (!roomId || !clientId) {
        reply.code(400);
        reply.send({ ok: false, message: "roomId 和 clientId 必填" });
        return;
      }

      // SSE 必要响应头
      setSSEHeaders(reply);

      // 写入工具
      const send = makeSSESender(reply.raw);

      // 加入房间
      const set = getOrCreateRoom(roomId);
      const client = { id: String(clientId), send, res: reply.raw };
      set.add(client);
      console.log(
        `[SSE] client ${clientId} joined room ${roomId}, size=${set.size}`
      );

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
        console.log(`[SSE] client ${clientId} left room ${roomId}`);
      });
    } catch (error) {
      console.error("[SSE] subscribe error:", error);
      reply.code(500).send({ ok: false, message: error.message });
    }
  });

  // 发送信令（HTTP POST）
  server.post("/api.signaling", async (request, reply) => {
    try {
      const { roomId, from, to, type, payload } = request.body || {};

      const err = validateSignalBody({ roomId, from, type });
      if (err) {
        reply.code(400);
        return { ok: false, message: err };
      }

      const message = { from, type, payload, ts: Date.now() };
      const delivered = broadcastToRoom(roomId, message, {
        excludeId: from,
        toId: to,
      });

      return { ok: true, delivered };
    } catch (error) {
      console.error("[SSE] post signaling error:", error);
      reply.code(500);
      return { ok: false, message: error.message };
    }
  });

  // 真随机数
  server.get("/api.TRNG", async () => {
    if (isRdrandSupported) {
      // CPU 随机数
      return rng.rdSeed64().toString(16);
    } else {
      return "not support rdSeed";
    }
  });

  // 节点更新
  server.put("/api.deploy", async (request, reply) => {
    const log = [];

    try {
      const isOwner = mp.isOwner(request.headers.authorization);
      if (!isOwner) {
        throw new Error("管理员 token 无效");
      }

      const rootPath = path.join(__dirname, "..");
      // 1. git pull
      log.push("执行 git pull...");
      const { stdout: gitOut, stderr: gitErr } = await execAsync("git pull", {
        cwd: rootPath,
      });
      log.push(`Git: ${gitOut || gitErr}`);

      // 检查是否有更新
      if (gitOut.includes("Already up")) {
        log.push("代码已是最新版本，无需部署");
        return {
          ok: true,
          message: "无需部署",
          log,
          timestamp: new Date().toJSON(),
        };
      }

      // 2. npm install
      log.push("执行 npm install...");
      const { stdout: npmOut, stderr: npmErr } = await execAsync("npm i", {
        cwd: rootPath,
      });
      log.push(`NPM: ${npmOut || npmErr}`);

      // 3. pm2 reload all
      log.push("执行 pm2 reload all...");
      const { stdout: pm2Out, stderr: pm2Err } = execAsync("pm2 reload all");
      log.push(`PM2: ${pm2Out || pm2Err}`);
      log.push("部署完成！");
      return {
        ok: true,
        message: "部署成功",
        log,
        timestamp: new Date().toJSON(),
      };
    } catch (error) {
      log.push(`Error: ${error.message}`);
      reply.code(500);
      return {
        ok: false,
        message: "部署失败",
        error: error.message,
        log,
        timestamp: new Date().toJSON(),
      };
    }
  });

  // 重启电脑
  server.put("/api.reboot", async (request, reply) => {
    try {
      const isOwner = mp.isOwner(request.headers.authorization);
      if (!isOwner) {
        reply.code(401);
        return { ok: false, message: "管理员 token 无效" };
      }

      let command;
      if (process.platform === "win32") {
        command = "shutdown /r /t 0";
      } else if (process.platform === "linux") {
        command = "sudo reboot";
      } else {
        reply.code(500);
        return {
          ok: false,
          message: `不支持的操作系统: ${process.platform}`,
          timestamp: new Date().toJSON(),
        };
      }

      // 立即返回成功响应，因为服务器即将关闭
      reply.send({
        ok: true,
        message: `正在执行重启命令: ${command}`,
        timestamp: new Date().toJSON(),
      });

      // 异步执行重启命令，不等待其完成
      exec(command, (error) => {
        if (error) {
          // 此处错误客户端无法收到，但可以在服务器日志中记录
          console.error(`执行重启时出错: ${error.message}`);
        }
      });
    } catch (error) {
      reply.code(500);
      return {
        ok: false,
        message: "发起重启失败",
        error: error.message,
        timestamp: new Date().toJSON(),
      };
    }
  });
};
