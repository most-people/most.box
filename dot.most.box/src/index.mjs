import "dotenv/config";
import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import fastifyCors from "@fastify/cors";
import { create } from "kubo-rpc-client";
import path from "path";
import { fileURLToPath } from "url";
import rng from "rdrand-lite";
import { registerFiles } from "./files.mjs";
import mp from "./mp.mjs";

const isRdrandSupported = rng.isRrdrandSupported();

// 创建 IPFS 客户端
const ipfs = create({ url: "http://localhost:5001" });

const server = fastify();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 注册 CORS 插件
server.register(fastifyCors, {
  origin: true, // 允许所有来源，生产环境建议指定具体域名
  credentials: true, // 允许携带凭证
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

// 注册静态文件服务
server.register(fastifyStatic, {
  root: path.join(__dirname, "../..", "app.most.box/out"),
  prefix: "/",
});

// 注册 multipart 插件用于文件上传
server.register(fastifyMultipart, {
  limits: {
    fileSize: 200 * 1024 * 1024, // 设置单个文件大小限制为200MB
    files: 1, // 限制同时上传的文件数量
  },
});

// 注册文件路由
registerFiles(server, ipfs);

server.get("/api.dot", async () => {
  return mp.getIP();
});

server.get("/api.TRNG", async () => {
  if (isRdrandSupported) {
    return rng.rdSeed64().toString(16);
  } else {
    return "not support rdSeed";
  }
});

// 简单部署接口：git pull + npm i + pm2 reload all
server.post("/deploy", async (request, reply) => {
  const log = [];

  try {
    const projectRoot = path.join(__dirname, "../../..");

    // 1. Git Pull
    log.push("执行 git pull...");
    const { stdout: gitOut, stderr: gitErr } = await execAsync("git pull", {
      cwd: projectRoot,
    });
    log.push(`Git: ${gitOut || gitErr}`);

    // 2. npm Install
    log.push("执行 npm install...");
    const { stdout: npmOut, stderr: npmErr } = await execAsync("npm i", {
      cwd: path.join(__dirname, ".."),
    });
    log.push(`npm: ${npmOut || npmErr}`);

    // 3. PM2 Reload All
    log.push("执行 pm2 reload all...");
    const { stdout: pm2Out, stderr: pm2Err } = await execAsync(
      "pm2 reload all"
    );
    log.push(`PM2: ${pm2Out || pm2Err}`);
    log.push("部署完成！");
    return {
      ok: true,
      message: "部署成功",
      log,
      timestamp: new Date().toJSON(),
    };
  } catch (error) {
    log.push(`错误: ${error.message}`);
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

const start = async () => {
  // 运行 DOT.MOST.BOX
  try {
    const peer = await ipfs.id();
    console.log("IPFS", peer.id);
    await server.listen({ port: mp.port, host: "::" });

    // 获取 IP 地址
    mp.initIP();
    console.log(mp.network);

    // 更新 IP 地址
    setInterval(() => {
      mp.initIP();
    }, 60 * 60 * 1000); // 每1小时执行一次
  } catch (error) {
    console.error(error);
    server.log.error(error);
    process.exit(1);
  }
};

start();
