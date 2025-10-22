import mp from "./mp.mjs";
// 压缩 zip
import archiver from "archiver";
// 解压 tar
import tar from "tar-stream";

const SystemDir = [".note"];

/**
 * 注册文件相关的路由
 * @param {import('fastify').FastifyInstance} server - Fastify 服务器实例
 * 注册文件相关的路由
 * @param {import('kubo-rpc-client').KuboRPCClient} ipfs - IPFS 客户端实例
 */
export const registerFiles = (server, ipfs) => {
  // 查找 MFS 文件路径 CID
  server.get("/files.cid/:uid/:dir/:name", async (request) => {
    const address = request.params["uid"] || "";
    const dir = request.params["dir"] || "";
    if (!SystemDir.includes(dir)) {
      return "";
    }
    const name = request.params["name"] || "";
    if (!name) {
      return "";
    }
    const fullPath = "/" + address.toLowerCase() + "/" + dir + "/" + name;
    try {
      const stat = await ipfs.files.stat(fullPath);
      return stat.cid.toV1().toString();
    } catch {
      return "";
    }
  });

  // 查找 MFS 根目录 CID
  server.post("/files.cid", async (request) => {
    const address = mp.getAddress(request.headers.authorization);
    if (!address) {
      return reply.code(400).send("token 无效");
    }
    const fullPath = "/" + address.toLowerCase();
    try {
      const stat = await ipfs.files.stat(fullPath);
      return stat.cid.toV1().toString();
    } catch {
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
        file.cid = file.cid.toV1();
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

      const targetPath = `/${address}/${filename}`;

      // 将文件添加到IPFS
      const fileAdded = await ipfs.add(buffer, {
        cidVersion: 1,
        rawLeaves: true,
      });

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

    if (!subPath) {
      return reply.code(400).send("文件不能为空");
    }

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

  // 重命名
  server.put("/files.rename", async (request, reply) => {
    const address = mp.getAddress(request.headers.authorization);
    if (!address) {
      return reply.code(400).send("token 无效");
    }

    const { oldName, newName } = request.body;

    if (!oldName || !newName) {
      return reply.code(400).send("缺少文件名参数");
    }

    if (oldName === newName) {
      return reply.code(400).send("新文件名与原文件名相同");
    }

    try {
      const oldPath = `/${address}${oldName}`;
      const newPath = `/${address}${newName}`;
      // 检查原文件是否存在
      try {
        await ipfs.files.stat(oldPath);
      } catch {
        return reply.code(404).send("原文件不存在");
      }

      // 检查新文件名是否已存在
      try {
        await ipfs.files.stat(newPath);
        return reply.code(409).send("新文件名已存在");
      } catch {
        // 文件不存在，可以继续重命名
      }

      // 执行重命名操作
      await ipfs.files.mv(oldPath, newPath);

      return {
        ok: true,
        message: "重命名成功",
        oldName: oldName,
        newName: newName,
      };
    } catch (error) {
      return reply.code(500).send("重命名失败 " + error.message);
    }
  });

  // 导入
  server.put("/files.import/:cid", async (request, reply) => {
    const address = mp.getAddress(request.headers.authorization);
    if (!address) {
      return reply.code(400).send("token 无效");
    }
    const cid = request.params.cid;
    if (!cid) {
      return reply.code(400).send("缺少 cid 参数");
    }

    try {
      await ipfs.files.rm(`/${address}`, { recursive: true, force: true });
      await ipfs.files.cp(`/ipfs/${cid}`, `/${address}`);
      return {
        ok: true,
        message: "导入成功",
        cid: cid,
      };
    } catch (error) {
      return reply.code(500).send("导入失败 " + error.message);
    }
  });
};
