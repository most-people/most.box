import mp from "./mp.mjs";
// 压缩 zip
import archiver from "archiver";
// 解压 tar
import tar from "tar-stream";

/**
 * 注册文件相关的路由
 * @param {import('fastify').FastifyInstance} server - Fastify 服务器实例
 * 注册文件相关的路由
 * @param {import('kubo-rpc-client').KuboRPCClient} ipfs - IPFS 客户端实例
 */
export const registerFiles = (server, ipfs) => {
  // 查找 MFS 文件路径 CID
  server.get("/files.find.cid/:uid/*", async (request) => {
    const address = request.params["uid"] || "";
    const path = request.params["*"] || "";
    const fullPath = "/" + address.toLowerCase() + "/" + path;
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

  // 下载 CID
  server.get("/files.download.directory/:cid", async (request, reply) => {
    const cid = request.params.cid;

    if (!cid) {
      return reply.code(400).send("缺少目录 CID 参数");
    }

    try {
      const ipfsPath = `/ipfs/${cid}`;

      // 检查是否为目录
      let stat;
      try {
        stat = await ipfs.files.stat(ipfsPath);
      } catch (error) {
        return reply.code(400).send("无法获取 CID 信息");
      }

      if (!stat.type === "directory") {
        return reply.code(400).send("CID 不是目录");
      }

      // 如果是目录，打包成 zip 下载
      const archive = archiver("zip", {
        zlib: { level: 9 }, // 压缩级别
      });

      // 设置响应头
      reply.header("Content-Type", "application/zip");
      reply.header("Content-Disposition", `attachment; filename="${cid}.zip"`);

      // 将 archive 流发送给客户端
      reply.send(archive);

      // 递归添加目录中的所有文件到 zip
      const addToArchive = async (path, archivePath = "") => {
        for await (const file of ipfs.ls(path)) {
          const filePath = `${path}/${file.name}`;
          const fileArchivePath = archivePath
            ? `${archivePath}/${file.name}`
            : file.name;

          if (file.type === "dir") {
            // 如果是目录，递归处理
            await addToArchive(filePath, fileArchivePath);
          } else {
            // 如果是文件，添加到 zip
            const chunks = [];
            for await (const chunk of ipfs.cat(filePath)) {
              chunks.push(chunk);
            }
            const content = Buffer.concat(chunks);
            archive.append(content, { name: fileArchivePath });
          }
        }
      };

      await addToArchive(ipfsPath);
      archive.finalize();
    } catch (error) {
      return reply.code(500).send("下载失败: " + error.message);
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

  // 上传 tar 压缩包并解压
  server.put("/files.import", async (request, reply) => {
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
      const filename = data.filename;

      // 检查文件是否为 tar 格式
      if (!filename.endsWith(".tar")) {
        return reply.code(400).send("只支持 .tar 格式的压缩包");
      }

      const targetPath = path ? `/${address}/${path}` : `/${address}`;

      const extract = tar.extract();
      const uploadedFiles = [];
      const errors = [];

      // 处理 tar 文件中的每个条目
      extract.on("entry", (header, stream, next) => {
        try {
          if (header.type === "file") {
            const chunks = [];

            stream.on("data", (chunk) => {
              chunks.push(chunk);
            });

            stream.on("end", async () => {
              try {
                const fileBuffer = Buffer.concat(chunks);
                const filePath = `${targetPath}/${header.name}`;

                // 将文件添加到 IPFS
                const fileAdded = await ipfs.add(fileBuffer, {
                  cidVersion: 1,
                  rawLeaves: true,
                });

                // 将文件复制到指定路径（自动创建父目录和覆盖已存在文件）
                await ipfs.files.cp(`/ipfs/${fileAdded.cid}`, filePath, {
                  parents: true,
                });

                uploadedFiles.push({
                  name: header.name,
                  path: filePath,
                  cid: fileAdded.cid.toString(),
                  size: fileAdded.size,
                });

                next();
              } catch (error) {
                errors.push(`文件 ${header.name} 上传失败: ${error.message}`);
                next();
              }
            });

            stream.on("error", (error) => {
              errors.push(`文件 ${header.name} 读取失败: ${error.message}`);
              next();
            });
          } else if (header.type === "directory") {
            // 创建目录
            (async () => {
              try {
                const dirPath = `${targetPath}/${header.name}`;
                await ipfs.files.mkdir(dirPath, { parents: true });
                uploadedFiles.push({
                  name: header.name,
                  path: dirPath,
                  type: "directory",
                });
                next();
              } catch (error) {
                errors.push(`目录 ${header.name} 创建失败: ${error.message}`);
                next();
              }
            })();
          } else {
            // 跳过其他类型的条目
            next();
          }
        } catch (error) {
          errors.push(`处理 ${header.name} 时出错: ${error.message}`);
          next();
        }
      });

      return new Promise((resolve, reject) => {
        extract.on("finish", () => {
          const result = {
            ok: true,
            message: `成功导入 ${uploadedFiles.length} 个文件`,
            name: uploadedFiles[0]?.name || "",
          };

          if (errors.length > 0) {
            result.message += `，但有 ${errors.length} 个文件处理失败`;
          }

          reply.code(200).send(result);
          resolve(result);
        });

        extract.on("error", (error) => {
          reply.code(500).send("tar 文件解压失败: " + error.message);
          reject(error);
        });

        extract.end(buffer);
      });
    } catch (error) {
      return reply.code(500).send("tar 压缩包上传失败 " + error.message);
    }
  });
};
