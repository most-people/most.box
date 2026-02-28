import { Hono } from "hono";
import { cryptoWaitReady, signatureVerify } from "@polkadot/util-crypto";
import { formatUnits } from "ethers";
import { Bindings, Variables } from "../types";
import { apiKy } from "../utils/api";

const CRUST_RPC_NODES = [
  "wss://crust.api.onfinality.io/public-ws",
  "wss://rpc.crust.network",
  "wss://rpc-crust-mainnet.decoo.io",
  "wss://api.decloudf.com",
];

// 认证中间件
const authMiddleware = async (c: any, next: any) => {
  try {
    const authHeader = c.req.header("Authorization");

    if (!authHeader) {
      return c.json({ error: "缺少 Authorization 请求头" }, 401);
    }

    const parts = authHeader.split(",");
    if (parts.length !== 3) {
      return c.json({ error: "无效的 Authorization 请求头格式" }, 401);
    }

    const [address, timestamp, signature] = parts;
    const now = Date.now();
    const time = parseInt(timestamp);

    // 验证时间戳是否在 5 分钟内
    if (isNaN(time) || Math.abs(now - time) > 5 * 60 * 1000) {
      return c.json({ error: "时间戳过期或无效" }, 401);
    }

    // 初始化加密库
    await cryptoWaitReady();

    // 验证签名
    // signatureVerify 能够识别并验证 Polkadot (Sr25519/Ed25519) 和 Ethereum (ECDSA) 签名
    const { isValid } = signatureVerify(timestamp, signature, address);

    if (!isValid) {
      return c.json({ error: "签名无效" }, 401);
    }

    c.set("address", address);
    await next();
  } catch (e: any) {
    console.error("Auth error:", e);
    return c.json({ error: "认证失败: " + e.message }, 500);
  }
};

// --- 受保护的 API 路由 ---
const api = new Hono<{ Bindings: Bindings; Variables: Variables }>();
api.use("/*", authMiddleware);

// 免费领取 CRU
api.post("/free.claim.cru", async (c) => {
  try {
    const address = c.get("address");
    const { turnstileToken } = await c.req.json();

    // 检查是否在本地/开发环境运行，以便选择性跳过 Turnstile 验证
    const isDev = c.env.ENVIRONMENT === "development";

    if (isDev) {
      console.log("开发环境跳过 Turnstile 验证");
    } else {
      if (!turnstileToken) {
        return c.json({ error: "缺少 Turnstile 令牌" }, 400);
      }
      // 1. 如果提供了令牌，则验证 Turnstile
      const ip = c.req.header("CF-Connecting-IP");
      const formData = new FormData();
      formData.append("secret", c.env.TURNSTILE_SECRET_KEY);
      formData.append("response", turnstileToken);
      formData.append("remoteip", ip || "");

      const turnstileResult = await apiKy
        .post("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          body: formData,
        })
        .json<any>();

      if (!turnstileResult.success) {
        return c.json({ error: "无效的 Turnstile 令牌" }, 400);
      }
    }

    // 2. 检查链上余额（必须为 0 才能领取）
    // 动态导入以避免为其他路由加载繁重的库
    const { ApiPromise, WsProvider } = await import("@polkadot/api");
    const { Keyring } = await import("@polkadot/keyring");
    const { typesBundleForPolkadot } =
      await import("@crustio/type-definitions");

    // 连接到 Crust
    const provider = new WsProvider(CRUST_RPC_NODES);

    const api = await ApiPromise.create({
      provider,
      typesBundle: typesBundleForPolkadot,
    });

    try {
      await api.isReady;

      // 检查余额
      const accountInfo = (await api.query.system.account(address)) as any;
      const freeBalance = accountInfo.data.free.toString();

      // 如果余额 > 0，则不是新用户
      if (BigInt(freeBalance) > 0n) {
        return c.json(
          { error: `不是新用户，当前余额 ${formatUnits(freeBalance, 12)} CRU` },
          400,
        );
      }

      const keyring = new Keyring({ type: "sr25519" });
      if (!c.env.FAUCET_MNEMONIC) {
        throw new Error(`服务器配置错误: 缺少 FAUCET_MNEMONIC 环境变量`);
      }
      const faucet = keyring.addFromUri(c.env.FAUCET_MNEMONIC);

      // 0.01 CRU
      const amount = "10000000000";

      const tx = api.tx.balances.transferKeepAlive(address, amount);

      const hash = await new Promise<string>((resolve, reject) => {
        tx.signAndSend(faucet, ({ status, dispatchError, txHash }) => {
          if (status.isFinalized) {
            resolve(txHash.toHex());
          } else if (dispatchError) {
            if (dispatchError.isModule) {
              const decoded = api.registry.findMetaError(
                dispatchError.asModule,
              );
              reject(new Error(`${decoded.section}.${decoded.name}`));
            } else {
              reject(new Error(dispatchError.toString()));
            }
          }
        }).catch(reject);
      });

      return c.json({ success: true, txHash: hash });
    } finally {
      await api.disconnect();
    }
  } catch (e: any) {
    console.error("领取失败:", e);
    return c.json({ error: "领取失败: " + e.message }, 500);
  }
});

// 云端备份
api.put("/backup", async (c) => {
  try {
    const address = c.get("address");
    const content = await c.req.text();
    const cid = c.req.header("x-backup-cid");

    if (!content) {
      return c.json({ error: "备份内容为空" }, 400);
    }

    await c.env.BACKUP_BUCKET.put(address, content, {
      customMetadata: {
        updatedAt: Date.now().toString(),
        cid: cid || "",
      },
    });
    return c.json({ success: true });
  } catch (e: any) {
    console.error("备份上传失败:", e);
    return c.json({ error: "备份上传失败: " + e.message }, 500);
  }
});

// 云端恢复
api.get("/backup", async (c) => {
  try {
    const address = c.get("address");
    const object = await c.env.BACKUP_BUCKET.get(address);

    if (!object) {
      return c.json({ error: "未找到备份文件" }, 404);
    }

    const content = await object.text();
    const headers: Record<string, string> = {
      "Content-Type": "text/plain",
    };

    if (object.customMetadata?.updatedAt) {
      headers["x-backup-time"] = object.customMetadata.updatedAt;
    }

    if (object.customMetadata?.cid) {
      headers["x-backup-cid"] = object.customMetadata.cid;
    }

    return c.text(content, 200, headers);
  } catch (e: any) {
    console.error("备份下载失败:", e);
    return c.json({ error: "备份下载失败: " + e.message }, 500);
  }
});

export default api;
