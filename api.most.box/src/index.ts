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

// 转发 IPFS 和 IPNS
app.get("/ipfs/*", (c) => {
  const url = new URL(c.req.url);
  url.hostname = "gw.crust-gateway.xyz";
  url.protocol = "https:";
  url.port = "";
  return c.redirect(url.toString(), 302);
});

app.get("/ipns/*", (c) => {
  const url = new URL(c.req.url);
  url.hostname = "gw.crust-gateway.xyz";
  url.protocol = "https:";
  url.port = "";
  return c.redirect(url.toString(), 302);
});

app.route("/api", api);

export default app;
