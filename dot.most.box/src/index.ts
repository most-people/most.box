import "dotenv/config";
import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import fastifyCors from "@fastify/cors";
import { create } from "kubo-rpc-client";
import path from "path";
import { fileURLToPath } from "url";

import { registerFiles } from "./files.js";
import { registerApis } from "./apis.js";
import { registerSSE } from "./sse.js";
import mp from "./mp.js";

// 创建 IPFS 客户端
const ipfs = create({ url: "http://127.0.0.1:5001" });

// 创建 Fastify 服务器
const server = fastify();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 注册 CORS 插件
server.register(fastifyCors, {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

// 注册静态文件服务
server.register(fastifyStatic, {
  root: path.join(__dirname, "../..", "app.most.box/out"),
  prefix: "/",
});

server.setNotFoundHandler((request, reply) => {
  reply.sendFile("404.html");
});

// 注册 multipart 插件用于文件上传
server.register(fastifyMultipart, {
  limits: {
    fileSize: 200 * 1024 * 1024,
    files: 1,
  },
});

// 注册文件路由
registerFiles(server, ipfs);
registerApis(server, __dirname);
registerSSE(server);

const start = async () => {
  try {
    const peer = await ipfs.id();
    console.log("IPFS", peer.id.toString());
  } catch (error) {
    console.error("⚠️\nIPFS 节点未运行，请启动 IPFS 节点\n");
    // process.exit(1);
  }

  try {
    await server.listen({ port: mp.PORT, host: "::" });

    mp.initIP();
    console.log(mp.network);

    // 每小时执行一次 IP 初始化
    setInterval(() => {
      mp.initIP();
    }, 60 * 60 * 1000);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

start();
