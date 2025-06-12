import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import fastifyCors from "@fastify/cors";
import { create } from "kubo-rpc-client";
import axios from "axios";
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

// 获取 IPv6
server.get("/ipv6", async () => {
  return network;
});

const initIPv4 = async () => {
  const apis = [
    "https://api.ipify.org",
    "https://ipv4.icanhazip.com",
    "https://checkip.amazonaws.com",
    "https://ipinfo.io/ip",
  ];

  let ipv4 = "";
  for (const api of apis) {
    try {
      const res = await axios.get(api, { timeout: 3000 });
      const ip = res.data?.trim();
      if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
        ipv4 = ip;
        break;
      }
    } catch (error) {
      continue;
    }
  }
  // 尝试获取 IPv4
  try {
    const res = await axios.get(`http://${ipv4}:${port}/ipv6`, {
      timeout: 2000,
    });
    if (res.data) {
      network.ipv4.push(`http://${ipv4}:${port}`);
    }
  } catch (error) {
    // 获取 IPv4 获取失败
  }
};

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
  initIPv4();
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
