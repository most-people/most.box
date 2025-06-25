import mp from "./mp.mjs";

/**
 * 注册文件相关的路由
 * @param {import('fastify').FastifyInstance} server - Fastify 服务器实例
 * 注册文件相关的路由
 * @param {import('kubo-rpc-client').KuboRPCClient} ipfs - IPFS 客户端实例
 */
export const registerFiles = (server, ipfs) => {
  // 查找文件 CID
  server.get("/find.cid/:uid/*", async (request) => {
    const address = request.params["uid"] || "";
    const path = request.params["*"] || "";
    const fullPath = "/" + address.toLowerCase() + "/" + path;
    try {
      const stat = await ipfs.files.stat(fullPath);
      return stat.cid.toString();
    } catch (error) {
      return "";
    }
  });

  // 查看文件/目录
  server.post("/files/*", async (request, reply) => {
    const address = mp.getAddress(request.headers.authorization);
    if (!address) {
      return reply.code(400).send("token 无效");
    }

    const subPath = request.params["*"] || ""; // 获取子路径
    try {
      // 构建完整路径，如果有子路径则包含子路径
      const fullPath = subPath ? `/${address}/${subPath}` : `/${address}`;
      const result = ipfs.files.ls(fullPath, { long: true });
      const entries = [];
      for await (const file of result) {
        entries.push(file);
      }
      return entries;
    } catch (error) {
      if (error.message.includes("file does not exist")) {
        return [];
      }
      return reply.code(500).send("文件列表获取失败 " + error.message);
    }
  });

  // 上传文件
  server.put("/files.upload", async (request, reply) => {
    const address = mp.getAddress(request.headers.authorization);
    if (!address) {
      return reply.code(400).send("token 无效");
    }

    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send("没有文件");
      }

      const buffer = await data.toBuffer();
      const path = data.fields.path?.value || "";
      const filename = path || data.filename || "unnamed";
      console.log("🌊", path);
      const targetPath = `/${address}/${filename}`;

      // 将文件添加到IPFS
      const fileAdded = await ipfs.add(buffer);

      // 检查文件是否已存在，如果存在则先删除
      try {
        await ipfs.files.stat(targetPath);
        // 文件存在，先删除
        await ipfs.files.rm(targetPath);
      } catch (error) {
        // 文件不存在，忽略错误
      }

      // 将文件复制到指定地址目录
      await ipfs.files.cp(`/ipfs/${fileAdded.cid}`, targetPath, {
        parents: true,
      });

      return {
        ok: true,
        message: "上传成功",
        filename: filename,
        cid: fileAdded.cid.toString(),
        size: fileAdded.size,
      };
    } catch (error) {
      return reply.code(500).send("文件上传失败 " + error.message);
    }
  });

  // 删除文件/目录
  server.delete("/files/*", async (request, reply) => {
    const address = mp.getAddress(request.headers.authorization);
    if (!address) {
      return reply.code(400).send("token 无效");
    }

    const subPath = request.params["*"] || ""; // 获取子路径
    try {
      // 构建完整路径，如果有子路径则包含子路径
      const fullPath = subPath ? `/${address}/${subPath}` : `/${address}`;
      await ipfs.files.rm(fullPath, { recursive: true });
      return {
        ok: true,
        message: "删除成功",
      };
    } catch (error) {
      return reply.code(500).send("文件删除失败 " + error.message);
    }
  });
};
