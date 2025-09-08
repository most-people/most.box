import mp from "./mp.mjs";
import rng from "rdrand-lite";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";

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

  // 全部节点
  server.get("/api.dots", async (request) => {
    let filename = 'mainnetDots.json';
    if (request.query?.network == 'testnet') {
      filename = 'testnetDots.json';
    }
    const fs = await import('fs/promises');
    const cachePath = path.join(os.homedir(), 'most.box', filename);
    const dots = await fs.readFile(cachePath, 'utf8');
    return dots;
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
      // 0. git checkout .
      log.push("执行 git checkout . (忽略本地修改)");
      const { stdout: checkoutOut, stderr: checkoutErr } = await execAsync("git checkout .", {
        cwd: rootPath,
      });
      log.push(`Git checkout: ${checkoutOut || checkoutErr}`);

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

  // 重启电脑
  server.put("/api.reboot", async (request, reply) => {
    try {
      const isOwner = mp.isOwner(request.headers.authorization);
      if (!isOwner) {
        reply.code(401);
        return { ok: false, message: "管理员 token 无效" };
      }

      let command;
      if (process.platform === "win32") {
        command = "shutdown /r /t 0";
      } else if (process.platform === "linux") {
        command = "sudo reboot";
      } else {
        reply.code(500);
        return {
          ok: false,
          message: `不支持的操作系统: ${process.platform}`,
          timestamp: new Date().toJSON(),
        };
      }

      // 立即返回成功响应，因为服务器即将关闭
      reply.send({
        ok: true,
        message: `正在执行重启命令: ${command}`,
        timestamp: new Date().toJSON(),
      });

      // 异步执行重启命令，不等待其完成
      exec(command, (error) => {
        if (error) {
          // 此处错误客户端无法收到，但可以在服务器日志中记录
          console.error(`执行重启时出错: ${error.message}`);
        }
      });
    } catch (error) {
      reply.code(500);
      return {
        ok: false,
        message: "发起重启失败",
        error: error.message,
        timestamp: new Date().toJSON(),
      };
    }
  });

  // 获取 git 仓库信息
  server.get("/api.git", async () => {
    const { stdout: gitOut, stderr: gitErr } = await execAsync("git remote -v");
    return gitOut || gitErr;
  });
};
