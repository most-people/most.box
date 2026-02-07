import { Hono } from "hono";
import { cors } from "hono/cors";
import { cryptoWaitReady, signatureVerify } from "@polkadot/util-crypto";

const CRUST_RPC_NODES = [
  "wss://crust.api.onfinality.io/public-ws",
  "wss://rpc.crust.network",
  "wss://rpc-crust-mainnet.decoo.io",
  "wss://api.decloudf.com",
];

type Bindings = {
  DB: D1Database;
  TURNSTILE_SECRET_KEY: string;
  FAUCET_MNEMONIC: string;
  ENVIRONMENT: string;
};

type Variables = {
  address: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// 1. CORS 中间件（必须在最前面以处理 OPTIONS 请求）
app.use("/*", cors());

// 2. 认证中间件
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

app.get("/", (c) => {
  return c.text("Most.Box 如影随形 - 数字资产，从此永生");
});

// --- 受保护的 API 路由 ---
app.use("/*", authMiddleware);

// 免费领取 CRU
app.post("/free.claim.cru", async (c) => {
  try {
    const address = c.get("address");
    const { turnstileToken } = await c.req.json();

    // Check if running locally/dev to optionally skip Turnstile
    const isDev = c.env.ENVIRONMENT === "development";

    if (!turnstileToken) {
      if (isDev) {
        console.log("开发环境跳过 Turnstile 验证");
      } else {
        return c.json({ error: "缺少 Turnstile 令牌" }, 400);
      }
    } else {
      // 1. Verify Turnstile if token is provided
      const ip = c.req.header("CF-Connecting-IP");
      const formData = new FormData();
      formData.append("secret", c.env.TURNSTILE_SECRET_KEY);
      formData.append("response", turnstileToken);
      formData.append("remoteip", ip || "");

      const turnstileRes = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          body: formData,
        },
      );
      const turnstileResult = await turnstileRes.json<any>();

      if (!turnstileResult.success) {
        return c.json({ error: "无效的 Turnstile 令牌" }, 400);
      }
    }

    // 2. Check on-chain balance (Must be 0 to claim)
    // Dynamic import to avoid loading heavy libs for other routes
    const { ApiPromise, WsProvider } = await import("@polkadot/api");
    const { Keyring } = await import("@polkadot/keyring");
    const { typesBundleForPolkadot } =
      await import("@crustio/type-definitions");

    // Connect to Crust
    const provider = new WsProvider(CRUST_RPC_NODES);

    const api = await ApiPromise.create({
      provider,
      typesBundle: typesBundleForPolkadot,
    });

    try {
      await api.isReady;

      // Check balance
      const accountInfo = (await api.query.system.account(address)) as any;
      const freeBalance = accountInfo.data.free.toString();

      // If balance > 0, not a new user
      if (BigInt(freeBalance) > 0n) {
        return c.json({ error: "非新用户（余额不为 0）" }, 400);
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

export default app;
