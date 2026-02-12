import { Hono } from "hono";
import { cors } from "hono/cors";
import api from "./routes/api";
import { Bindings, Variables } from "./types";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// 1. CORS 中间件（必须在最前面以处理 OPTIONS 请求）
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "x-backup-cid"],
    exposeHeaders: ["x-backup-time", "x-backup-cid"],
    allowMethods: ["POST", "GET", "OPTIONS", "PUT"],
    maxAge: 600,
  }),
);

app.get("/", (c) => {
  return c.text("Most.Box 如影随形 - 数字资产，从此永生");
});

// 转发
app.get("/81.jpg", (c) => {
  const targetUrl =
    "https://gw.crust-gateway.xyz/ipfs/bafkreihp5o7tdipf6ajkgkdxknnffkuxpeecwqydi4q5iqt4gko6r2agk4?filename=%E9%95%BF%E5%BE%81.jpg";
  return c.redirect(targetUrl, 302);
});

app.route("/api", api);

export default app;
