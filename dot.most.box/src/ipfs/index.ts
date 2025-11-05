// 通过合并角色模板与节点清单生成 IPFS 配置
// 输入：custom.json、dhtclient.json、dhtserver.json
// 输出：从本地 IPFS 仓库磁盘读取当前配置与 Peer ID，按 custom.json 与角色模板进行细粒度合并，写入到 .ipfs/config
/**
 * 模块概述：
 * - 检测本机 IPFS/Kubo HTTP API（支持环境变量与常见默认端口）
 * - 读取角色模板（dhtclient/dhtserver）与网络节点清单（custom.json）
 * - 依据当前 Peer 身份生成 Announce/Bootstrap/Peering 等配置并通过 HTTP API 替换运行时配置
 *
 * 设计原则：
 * - 保守覆盖：仅在模板明确给定时更新字段；保留现有 Swarm 等数组
 * - 可调参数：通过环境变量调整端口与邻居选择规模，适配 100 节点规模
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { RequestInit } from "undici";

type NodeRole = "dhtclient" | "dhtserver";
/**
 * 节点清单中的单个节点定义
 * - name：显示名称
 * - type：角色类型（dhtclient/dhtserver）
 * - id：Peer ID（/p2p/<ID> 中的 ID）
 * - ip：可拨号的基础 multiaddr（不含 /p2p），如 /ip4/1.2.3.4 或 /dnsaddr/example.com
 * - port：Swarm 端口（若未给定则使用 DEFAULT_PORT）
 */
type NodeDef = {
  name: string;
  type: NodeRole;
  id: string;
  ip: string[];
  port?: number;
};
/**
 * 通过 HTTP API 获取到的配置信息
 * - config：当前运行节点的完整配置
 * - peerId：当前运行节点的 Peer ID
 * - source：配置来源（此处固定为 "http"）
 * - apiBase：HTTP API 基地址，如 http://127.0.0.1:5001
 */
type IpfsHttpInfo = {
  config: any;
  peerId: string;
  source: "http";
  apiBase: string;
};

// 文件路径（ESM 环境下的等价 __dirname/__filename）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 网络清单与角色模板所在目录（与本文件同级）
const NETWORK_ROOT = __dirname;

// 环境变量调参（为 100 节点规模提供合理默认值）
// DEFAULT_PORT：Swarm 端口默认值（TCP/QUIC 共用）；可通过环境变量覆盖
const DEFAULT_PORT = Number(process.env.DEFAULT_PORT || 4001);
// BOOTSTRAP_K：作为 Bootstrap 的 dhtserver 数量上限
const BOOTSTRAP_K = Number(process.env.BOOTSTRAP_K || 8);
// PEERING_RING：环形邻居，左右各多少个（不含自身）
const PEERING_RING = Number(process.env.PEERING_RING || 3);
// PEERING_RANDOM：额外随机邻居数量（优先选择 dhtserver）
const PEERING_RANDOM = Number(process.env.PEERING_RANDOM || 3);

// HTTP API 相关：支持 IPFS Desktop 与 Kubo 默认端口；允许通过环境变量覆盖
/**
 * API_CANDIDATE_PORTS：检测本机 IPFS/Kubo HTTP API 的候选端口
 * - 默认包含 Kubo 默认端口 5001 与 IPFS Desktop 常见端口 45005
 * - 可通过环境变量 `IPFS_API_PORTS` 传入逗号分隔的端口列表，如："5001,8080,45005"
 */
const API_CANDIDATE_PORTS = (process.env.IPFS_API_PORTS || "5001,45005")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);

/**
 * 去除 URL 末尾的多余斜杠
 */
const trimSlash = (urlBase: unknown): string => {
  return String(urlBase || "").replace(/\/+$/, "");
};

/**
 * 将 multiaddr 转为 HTTP 基地址
 * 支持示例：
 * - /ip4/127.0.0.1/tcp/5001 -> http://127.0.0.1:5001
 * - /dns4/localhost/tcp/5001 -> http://localhost:5001
 * - 若输入已是 http/https 则直接归一化返回
 */
const multiaddrToHttp = (addr: string | null | undefined): string | null => {
  if (!addr || typeof addr !== "string") return null;
  if (/^https?:\/\//i.test(addr)) return trimSlash(addr);
  const m = addr.match(
    /^\/(ip4|ip6|dns|dns4|dns6|dnsaddr)\/([^/]+)\/tcp\/(\d+)(?:\/.*)?$/i
  );
  if (m) {
    const host = m[2];
    const port = Number(m[3]);
    if (Number.isFinite(port)) return `http://${host}:${port}`;
  }
  return null;
};

/**
 * 从环境变量解析 HTTP API 基地址
 * 支持变量：`IPFS_API`、`KUBO_API`、`IPFS_HTTP_API`
 * - 可传 multiaddr 或 http(s) URL；前者将被转换为 http URL
 */
const parseApiFromEnv = (): string | null => {
  const envRaw = (
    process.env.IPFS_API ||
    process.env.KUBO_API ||
    process.env.IPFS_HTTP_API ||
    ""
  ).trim();
  if (!envRaw) return null;
  const parsed = multiaddrToHttp(envRaw) || trimSlash(envRaw);
  return parsed || null;
};

/**
 * 带超时控制的 fetch（POST 默认由调用方传入）
 * - 使用 AbortController 在超时后主动中止请求
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> => {
  const controller = new AbortController();
  const t = setTimeout(
    () => controller.abort(new Error(`请求超时 ${timeoutMs}ms: ${url}`)),
    timeoutMs
  );
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    } as any);
    return res;
  } finally {
    clearTimeout(t);
  }
};

/**
 * 以 POST 获取 JSON 响应，并在解析失败时给出片段提示
 */
const fetchJsonPOST = async (
  url: string,
  body: any = undefined,
  timeoutMs = 8000
): Promise<any> => {
  const res = await fetchWithTimeout(url, { method: "POST", body }, timeoutMs);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  try {
    return JSON.parse(text);
  } catch (e: any) {
    throw new Error(
      `解析 JSON 失败：${e.message} | 响应片段：${text.slice(0, 200)}`
    );
  }
};

/**
 * 快速探测 HTTP API 是否可用（调用 /api/v0/version）
 */
const isApiAlive = async (base: string): Promise<boolean> => {
  try {
    const res = await fetchWithTimeout(
      `${base}/api/v0/version`,
      { method: "POST" },
      1500
    );
    return res.ok;
  } catch (e) {
    return false;
  }
};

/**
 * 自动检测本机可用的 HTTP API 基地址
 * - 优先使用环境变量提供的地址，其次尝试本机 127.0.0.1 上的候选端口
 */
const detectApiBase = async (): Promise<string | null> => {
  const envBase = parseApiFromEnv();
  const candidates: string[] = [];
  if (envBase) candidates.push(envBase);
  // 常见默认端口（Kubo 默认 5001，IPFS Desktop 常见 45005）
  for (const p of API_CANDIDATE_PORTS) candidates.push(`http://127.0.0.1:${p}`);
  // 去重
  const list = dedupe(candidates);
  for (const base of list) {
    if (await isApiAlive(base)) return base;
  }
  return null;
};

/**
 * 通过 HTTP API 拉取当前配置与 Peer ID
 */
const getIpfsInfoFromHttp = async (apiBase: string): Promise<IpfsHttpInfo> => {
  const cfg = await fetchJsonPOST(`${apiBase}/api/v0/config/show`);
  const id = await fetchJsonPOST(`${apiBase}/api/v0/id`);
  const peerId = id && (id.ID || id.Id || id.PeerID || id.PeerId);
  if (!peerId) throw new Error("HTTP API 的 /id 未返回 Peer ID");
  return { config: cfg, peerId, source: "http", apiBase };
};

/**
 * 通过 HTTP API 替换运行时配置（/api/v0/config/replace）
 * - 以 multipart/form-data 方式上传完整配置文件
 */
const applyConfigViaHttp = async (
  apiBase: string,
  finalCfg: any
): Promise<string> => {
  const form = new FormData();
  const blob = new Blob([JSON.stringify(finalCfg, null, 2) + "\n"], {
    type: "application/json",
  });
  form.append("file", blob, "config");
  const res = await fetchWithTimeout(
    `${apiBase}/api/v0/config/replace`,
    { method: "POST", body: form as any },
    12000
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`配置替换失败：HTTP ${res.status}: ${text}`);
  return text;
};

/**
 * 从磁盘读取并解析 JSON 文件
 */
const readJson = async (filePath: string): Promise<any> => {
  const text = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (e: any) {
    throw new Error(`JSON 解析失败：${filePath}：${e.message}`);
  }
};

/**
 * 简单的深拷贝（通过 JSON 序列化）
 */
const deepClone = (obj: any): any => JSON.parse(JSON.stringify(obj));

/**
 * 在基础 multiaddr 上附加 TCP 端口
 */
const addTcp = (base: string, port: number = DEFAULT_PORT): string => {
  return `${base}/tcp/${port}`;
};

/**
 * 在基础 multiaddr 上附加 QUIC v1（UDP）端口
 */
const addUdpQuic = (base: string, port: number = DEFAULT_PORT): string => {
  return `${base}/udp/${port}/quic-v1`;
};

/**
 * 在 TCP multiaddr 上附加 /p2p/<PeerID>
 */
const addP2pTcp = (
  base: string,
  peerId: string,
  port: number = DEFAULT_PORT
): string => {
  return `${addTcp(base, port)}/p2p/${peerId}`;
};

// 工具函数
/**
 * 判断是否为 /dnsaddr/<host> 形式（此类地址无需附加 /tcp 或 /p2p）
 */
const isDnsaddr = (ma: unknown): boolean => {
  return typeof ma === "string" && ma.startsWith("/dnsaddr/");
};

/**
 * 数组去重（保持首次出现顺序）
 */
const dedupe = <T>(list: T[] = []): T[] => {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const v of list || []) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
};

/**
 * 数组随机打乱（Fisher–Yates）
 */
const shuffle = <T>(arr: T[]): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * 随机选取至多 k 个元素
 */
const pickK = <T>(arr: T[], k: number): T[] => {
  if (k <= 0) return [];
  return shuffle(arr).slice(0, Math.min(k, arr.length));
};

/**
 * 获取节点的 Swarm 端口，若未设置或非法则回退到 DEFAULT_PORT
 */
const nodePort = (node: { port?: number } | null | undefined): number => {
  const p =
    node && (node as any).port !== undefined
      ? Number((node as any).port)
      : DEFAULT_PORT;
  return Number.isFinite(p) && p > 0 ? p : DEFAULT_PORT;
};

// 将基础 multiaddr 规范化为可拨号地址（不带 /p2p），用于 Peering.Addrs
const normalizeNoP2p = (base: string, port?: number): string[] => {
  if (isDnsaddr(base)) return [base];
  const p = port || DEFAULT_PORT;
  return [addTcp(base, p), addUdpQuic(base, p)];
};

// 将基础 multiaddr 规范化为可拨号地址（带 /p2p），用于 Bootstrap 条目
const normalizeWithP2p = (
  base: string,
  peerId: string,
  port?: number
): string[] => {
  if (isDnsaddr(base)) return [base];
  const p = port || DEFAULT_PORT;
  return [addP2pTcp(base, peerId, p), `${addUdpQuic(base, p)}/p2p/${peerId}`];
};

/**
 * 构建 Announce 列表：将 IP 列表扩展为 TCP+QUIC 拨号地址（无 /p2p）
 */
const buildAnnounce = (
  ipList: string[],
  port: number = DEFAULT_PORT
): string[] => {
  const out: string[] = [];
  for (const ip of ipList || []) {
    for (const a of normalizeNoP2p(ip, port)) out.push(a);
  }
  return dedupe(out);
};

// Bootstrap：仅选择 dhtserver 节点，限制为 BOOTSTRAP_K 个，并包含 TCP 与 QUIC 的 /p2p 地址
const buildBootstrap = (nodes: NodeDef[]): string[] => {
  const servers = (nodes || []).filter(
    (n) => n && n.type === "dhtserver" && Array.isArray(n.ip) && n.ip.length > 0
  );
  const selected = pickK(servers, BOOTSTRAP_K);
  const out: string[] = [];
  for (const node of selected) {
    const p = nodePort(node);
    for (const ip of node.ip) {
      for (const a of normalizeWithP2p(ip, node.id, p)) out.push(a);
    }
  }
  return dedupe(out);
};

// Peering：针对本地节点，选择环形邻居 + 随机邻居，生成 TCP 与 QUIC 地址（不带 /p2p）
const buildPeeringForLocal = (
  nodes: NodeDef[],
  localPeerId: string
): Array<{ ID: string; Addrs: string[] }> => {
  const arr: NodeDef[] = Array.isArray(nodes) ? nodes.slice() : ([] as any);
  const idx = arr.findIndex((n) => n && n.id === localPeerId);
  const N = arr.length;

  function at(i: number): NodeDef | undefined {
    return arr[((i % N) + N) % N];
  }

  const chosen = new Map<string, NodeDef>(); // id -> node
  if (N > 0 && idx >= 0) {
    // 环形邻居（左右各 PEERING_RING 个）
    for (let d = 1; d <= PEERING_RING; d++) {
      const left = at(idx - d);
      const right = at(idx + d);
      if (left && left.id !== localPeerId) chosen.set(left.id, left);
      if (right && right.id !== localPeerId) chosen.set(right.id, right);
    }
  }

  // 随机选择，优先 dhtserver 节点
  const others = arr.filter((n) => n && n.id !== localPeerId);
  const prefer = others.filter(
    (n) => Array.isArray(n.ip) && n.ip.length > 0 && n.type === "dhtserver"
  );
  const fallback = others.filter(
    (n) => Array.isArray(n.ip) && n.ip.length > 0 && n.type !== "dhtserver"
  );
  for (const n of pickK(prefer, PEERING_RANDOM)) chosen.set(n.id, n);
  if (chosen.size < PEERING_RING * 2 + PEERING_RANDOM) {
    for (const n of pickK(fallback, PEERING_RANDOM)) chosen.set(n.id, n);
  }

  // 构建 Peering 对象
  const peers: Array<{ ID: string; Addrs: string[] }> = [];
  for (const node of chosen.values()) {
    const p = nodePort(node);
    const addrs: string[] = [];
    for (const ip of node.ip || []) {
      for (const a of normalizeNoP2p(ip, p)) addrs.push(a);
    }
    const deduped = dedupe(addrs);
    if (deduped.length > 0) {
      peers.push({ ID: node.id, Addrs: deduped });
    }
  }
  return peers;
};

/**
 * 细粒度对象合并：
 * - 数组：保守策略，若目标不存在则复制模板；若存在则保留目标
 * - 对象：递归合并
 * - 基本类型：用模板值覆盖
 */
const mergeObjects = (target: any, source: any): any => {
  if (!source || typeof source !== "object") return target;
  if (!target || typeof target !== "object") target = {};
  for (const key of Object.keys(source)) {
    const sv = (source as any)[key];
    const tv = (target as any)[key];
    if (Array.isArray(sv)) {
      // 对数组采用保守策略：若目标不存在则使用模板；若存在则保留目标
      if (tv === undefined) {
        (target as any)[key] = deepClone(sv);
      }
    } else if (sv && typeof sv === "object") {
      (target as any)[key] = mergeObjects(
        tv && typeof tv === "object" ? tv : {},
        sv
      );
    } else {
      (target as any)[key] = sv;
    }
  }
  return target;
};

/**
 * 在当前配置基础上，合并 Announce/Bootstrap/Peering 与角色模板细粒度字段
 */
const mergeBaseWithExtras = (
  baseCfg: any,
  {
    announceAddrs,
    bootstrapAddrs,
    peeringPeers,
    roleCfg,
  }: {
    announceAddrs: string[];
    bootstrapAddrs: string[];
    peeringPeers: Array<{ ID: string; Addrs: string[] }>;
    roleCfg: any;
  }
): any => {
  const cfg = deepClone(baseCfg);

  // Addresses：保留现有 Swarm，不覆盖；仅设置 Announce
  (cfg.Addresses ||= {}).Announce = announceAddrs;

  // Bootstrap 列表（来自 custom.json）
  cfg.Bootstrap = bootstrapAddrs;

  // Peering 列表（来自 custom.json）
  cfg.Peering = { Peers: peeringPeers };

  // Routing.Type 按模板角色设置
  cfg.Routing = cfg.Routing || {};
  if (roleCfg && roleCfg.Routing && roleCfg.Routing.Type) {
    cfg.Routing.Type = roleCfg.Routing.Type;
  }

  // 细粒度合并：将角色模板中的 Swarm / Pubsub / Provide 合并到当前配置
  if (roleCfg) {
    if (roleCfg.Swarm) {
      cfg.Swarm = mergeObjects(cfg.Swarm || {}, roleCfg.Swarm);
    }
    if (roleCfg.Pubsub) {
      cfg.Pubsub = mergeObjects(cfg.Pubsub || {}, roleCfg.Pubsub);
    }
    if (roleCfg.Provide) {
      cfg.Provide = mergeObjects(cfg.Provide || {}, roleCfg.Provide);
    }
  }
  delete cfg.Reprovider;

  return cfg;
};

/**
 * 获取当前运行节点的配置与 Peer 信息（若未检测到 HTTP API 则抛错）
 */
const getCurrentIpfsInfo = async (): Promise<IpfsHttpInfo> => {
  // 仅在检测到 HTTP API 时才继续；否则直接停止
  const apiBase = await detectApiBase();
  if (!apiBase) {
    throw new Error(
      "未检测到可用的 IPFS HTTP API（常见端口 5001 或 IPFS Desktop 端口 45005）。请确保守护进程已开启 HTTP API。"
    );
  }
  // 通过 HTTP API 获取当前运行的配置与 Peer ID
  return await getIpfsInfoFromHttp(apiBase);
};

/**
 * 主流程：
 * 1) 读取 custom.json 与角色模板
 * 2) 构建全局 Bootstrap 列表
 * 3) 基于当前节点身份生成 Announce/Peering 并细粒度合并角色模板
 * 4) 通过 HTTP API 替换运行时配置并输出摘要
 */
const main = async (): Promise<void> => {
  const customPath = path.join(NETWORK_ROOT, "custom.json");
  const dhtClientPath = path.join(NETWORK_ROOT, "dhtclient.json");
  const dhtServerPath = path.join(NETWORK_ROOT, "dhtserver.json");

  const custom = await readJson(customPath);
  if (!Array.isArray(custom)) {
    throw new Error("custom.json 必须是节点定义的数组");
  }

  const dhtClient = await readJson(dhtClientPath);
  const dhtServer = await readJson(dhtServerPath);

  // 预计算全网共享列表
  // Bootstrap：选择有限数量的 dhtserver，包含 TCP + QUIC + /p2p，并进行去重
  const bootstrapAddrs = buildBootstrap(custom as NodeDef[]);

  // 默认流程：获取当前 IPFS 配置与 peer id，按 custom.json 与角色模板进行更细粒度合并
  try {
    const info = await getCurrentIpfsInfo();
    const { config: currentCfg, peerId } = info;

    const matched = (custom as NodeDef[]).find((n) => n.id === peerId);
    const roleCfg =
      matched && matched.type === "dhtserver" ? dhtServer : dhtClient;
    const announceAddrs = buildAnnounce(
      matched ? matched.ip : [],
      matched ? nodePort(matched) : DEFAULT_PORT
    );
    // Peering: 固定邻居（环形） + 随机邻居（优先 dhtserver），不带 /p2p
    const peeringPeers = buildPeeringForLocal(custom as NodeDef[], peerId);

    const finalCfg = mergeBaseWithExtras(currentCfg, {
      announceAddrs,
      bootstrapAddrs,
      peeringPeers,
      roleCfg,
    });

    if (info && info.source === "http" && info.apiBase) {
      try {
        await applyConfigViaHttp(info.apiBase, finalCfg);
        console.log(
          `已通过 HTTP API (${info.apiBase}) 替换正在运行的 IPFS 配置。`
        );
      } catch (e: any) {
        console.error(`通过 HTTP API 替换失败：${e.message}`);
        process.exit(1);
      }
    }

    console.log(
      `本地 Peer：${peerId}（${matched ? matched.name : "未知"}）\n` +
        `Bootstrap 条目数：${bootstrapAddrs.length}，Peering 固定邻居数：${peeringPeers.length}，Announce 条目数：${announceAddrs.length}`
    );
    if (info && info.source === "http") {
      console.log(`配置源：HTTP API（${info.apiBase}）。`);
    }
  } catch (err: any) {
    console.error("错误：获取 IPFS 配置或 Peer ID 失败。", err);
    process.exit(1);
  }
};

main().catch((err: any) => {
  console.error("生成 IPFS 配置出错：", err);
  process.exit(1);
});
