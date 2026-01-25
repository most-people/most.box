import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  cryptoWaitReady,
  signatureVerify,
  mnemonicGenerate,
} from "@polkadot/util-crypto";
import { Keyring } from "@polkadot/keyring";

type Bindings = {
  DB: D1Database;
};

type Variables = {
  address: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("/*", cors());

app.get("/", (c) => {
  return c.text("Welcome to api.most.box");
});

// 认证中间件
const authMiddleware = async (c: any, next: any) => {
  try {
    const address = c.req.header("x-address");

    // mock jump for dev
    if (address) {
      c.set("address", address);
      await next();
      return;
    }

    const signature = c.req.header("x-signature");
    const timestampStr = c.req.header("x-timestamp");

    if (!address || !signature || !timestampStr) {
      return c.json({ error: "Missing authentication headers" }, 401);
    }

    const timestamp = parseInt(timestampStr);
    const now = Date.now();

    // 验证时间戳是否在 5 分钟内
    if (isNaN(timestamp) || Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return c.json({ error: "Timestamp expired or invalid" }, 401);
    }

    // 初始化加密库 (Polkadot JS 需要)
    await cryptoWaitReady();

    // 验证签名
    // 被签名的消息是时间戳字符串
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

// 受保护的路由
app.use("/*", authMiddleware);

// 开发接口

app.get("/admin.users", async (c) => {
  try {
    const { results } = await c.env.DB.prepare("SELECT * FROM users").all();
    return c.json(results);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post("/admin.clear.users", async (c) => {
  try {
    // 硬编码需要清空的表名列表，避免访问 sqlite_master 导致的权限错误
    const tables = ["users"];
    const clearedTables = [];

    for (const table of tables) {
      // 清空表数据
      await c.env.DB.prepare(`DELETE FROM "${table}"`).run();

      // 尝试重置自增计数器 (如果失败则忽略，不影响数据清空)
      try {
        await c.env.DB.prepare("DELETE FROM sqlite_sequence WHERE name = ?")
          .bind(table)
          .run();
      } catch (e) {
        console.warn(`Failed to reset sequence for ${table}:`, e);
      }

      clearedTables.push(table);
    }

    return c.json({
      message: "Database cleared successfully",
      cleared_tables: clearedTables,
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// 用户接口

app.post("/user.set", async (c) => {
  try {
    const address = c.get("address");

    const { username } = await c.req.json();

    if (!username) {
      return c.json({ error: "Username is required" }, 400);
    }

    const now = Date.now();

    // 插入或更新用户
    // created_at 仅在插入时记录
    await c.env.DB.prepare(
      `
      INSERT INTO users (address, username, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(address) DO UPDATE SET username = excluded.username
    `,
    )
      .bind(address, username, now)
      .run();

    return c.json({ message: "User saved successfully" });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post("/user.get", async (c) => {
  try {
    const address = c.get("address");

    const user = await c.env.DB.prepare("SELECT * FROM users WHERE address = ?")
      .bind(address)
      .first();

    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }
    return c.json(user);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post("/user.delete", async (c) => {
  try {
    const address = c.get("address");

    const result = await c.env.DB.prepare("DELETE FROM users WHERE address = ?")
      .bind(address)
      .run();

    if (result.success) {
      return c.json({ message: "User deleted successfully" });
    } else {
      return c.json({ error: "Failed to delete user" }, 500);
    }
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

export default app;
