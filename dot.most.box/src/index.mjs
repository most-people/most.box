import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { registerFiles } from "./files.mjs";

const port = 1976;

const server = fastify();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 注册静态文件服务
server.register(fastifyStatic, {
  root: path.join(__dirname, "..", "public"),
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
registerFiles(server);

// 添加IPv6地址API接口
server.get("/ipv6", async (request, reply) => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (
        iface.family === "IPv6" &&
        !iface.internal &&
        !iface.address.startsWith("fe80")
      ) {
        return { url: `http://[${iface.address}]:${port}` };
      }
    }
  }
  return {
    url: "",
  };
});

const start = async () => {
  try {
    await server.listen({ port, host: "::" });
    console.log(`http://[::1]:${port}`);
  } catch (err) {
    console.error(err);
    server.log.error(err);
    process.exit(1);
  }
};

start();
