import rng from "rdrand-lite";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const isRdrandSupported = rng.isRrdrandSupported();

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
};
