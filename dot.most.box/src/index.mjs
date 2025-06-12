import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import fastifyCors from "@fastify/cors";
import { create } from "kubo-rpc-client";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { registerFiles } from "./files.mjs";

// 创建 IPFS 客户端
const ipfs = create({ url: "http://127.0.0.1:5001" });

const port = 1976;

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

const network = {
  ipv4: [`http://localhost:${port}`],
  ipv6: [`http://[::1]:${port}`],
};

// 添加IPv6地址API接口
server.get("/ipv6", async () => {
  return network;
});

const initIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 获取 IPv4 地址
      if (iface.family === "IPv4" && !iface.internal) {
        network.ipv4.push(`http://${iface.address}:${port}`);
      }
      // 获取 IPv6 地址
      if (
        iface.family === "IPv6" &&
        !iface.internal &&
        !iface.address.startsWith("fe80")
      ) {
        network.ipv6.push(`http://[${iface.address}]:${port}`);
      }
    }
  }
};

const start = async () => {
  // 获取 IP 地址
  initIP();
  // 运行 DOT.MOST.BOX
  try {
    const peer = await ipfs.id();
    console.log("IPFS", peer.id);
    await server.listen({ port, host: "::" });
    console.log(network);
  } catch (err) {
    console.error(err);
    server.log.error(err);
    process.exit(1);
  }
};

start();
