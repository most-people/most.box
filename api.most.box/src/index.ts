import { Hono } from "hono";
import { cors } from "hono/cors";
import { cryptoWaitReady, signatureVerify } from "@polkadot/util-crypto";

type Bindings = {
  DB: D1Database;
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
      return c.json({ error: "Missing Authorization header" }, 401);
    }

    const [address, timestampStr, signature] = authHeader.split(",");

    if (!address || !signature || !timestampStr) {
      return c.json({ error: "Invalid Authorization header format" }, 401);
    }

    const timestamp = parseInt(timestampStr);
    const now = Date.now();

    // 验证时间戳是否在 5 分钟内
    if (isNaN(timestamp) || Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return c.json({ error: "Timestamp expired or invalid" }, 401);
    }

    // 初始化加密库
    await cryptoWaitReady();

    // 验证签名
    // signatureVerify 能够识别并验证 Polkadot (Sr25519/Ed25519) 和 Ethereum (ECDSA) 签名
    const { isValid } = signatureVerify(timestampStr, signature, address);

    if (!isValid) {
      return c.json({ error: "Invalid signature" }, 401);
    }

    c.set("address", address);
    await next();
  } catch (e: any) {
    console.error("Auth error:", e);
    return c.json({ error: "Authentication failed: " + e.message }, 500);
  }
};

app.get("/", (c) => {
  return c.text("Most.Box 如影随形 - 数字资产，从此永生");
});

// --- 受保护的 API 路由 ---
app.use("/*", authMiddleware);

export default app;
