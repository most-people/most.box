import "dotenv/config";
import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import fastifyCors from "@fastify/cors";
import { create } from "kubo-rpc-client";
import path from "path";
import { fileURLToPath } from "url";

import { registerFiles } from "./files.mjs";
import { registerApis } from "./apis.mjs";
import { registerSSE } from "./sse.mjs";
import mp from "./mp.mjs";

// 创建 IPFS 客户端
const ipfs = create({ url: "http://127.0.0.1:5001" });

// 创建 Fastify 服务器
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

server.setNotFoundHandler((request, reply) => {
  reply.sendFile("404.html");
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
registerApis(server, __dirname);
registerSSE(server);

const start = async () => {
  // 检测 IPFS 节点是否运行
  try {
    const peer = await ipfs.id();
    console.log("IPFS", peer.id);
  } catch (error) {
    console.error("IPFS 节点未运行，请启动 IPFS 节点");
    process.exit(1);
  }

  // 启动 Most.Box
  try {
    await server.listen({ port: mp.PORT, host: "::" });

    // 获取 IP 地址
    mp.initIP();
    console.log(mp.network);

    // 更新 IP 地址
    setInterval(() => {
      mp.initIP();
    }, 60 * 60 * 1000); // 每1小时执行一次
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

start();
