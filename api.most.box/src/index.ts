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

// 优选网关列表
const GATEWAYS = [
  "https://gw.crust-gateway.xyz",
  "https://gw.crust-gateway.com",
  "https://ipfs.io",
  "https://dweb.link",
  "https://gateway.pinata.cloud",
  "https://ipfs.filebase.io",
  "https://w3s.link",
  "https://dget.top",
];

const GATEWAY = GATEWAYS[0];

// 转发 IPFS 和 IPNS
app.get("/ipfs/*", async (c) => {
  const url = new URL(c.req.url);
  const path = url.pathname + url.search;
  return c.redirect(`${GATEWAY}${path}`, 302);
});

app.get("/ipns/*", (c) => {
  const url = new URL(c.req.url);
  const path = url.pathname + url.search;
  return c.redirect(`${GATEWAY}${path}`, 302);
});

app.route("/api", api);

// 兜底路由：重定向到主站
app.get("/*", (c) => {
  // return c.text("Most.Box 如影随形 - 数字资产，从此永生");
  const url = new URL(c.req.url);
  const path = url.pathname + url.search;
  return c.redirect(`https://most.box${path}`, 302);
});

export default app;
