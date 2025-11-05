// 通过合并角色模板与节点清单生成 IPFS 配置
// 输入：custom.json、dhtclient.json、dhtserver.json
// 输出：从本地 IPFS 仓库磁盘读取当前配置与 Peer ID，按 custom.json 与角色模板进行细粒度合并，写入到 .ipfs/config
/**
 * 模块概述：
 * - 检测本机 IPFS/Kubo HTTP API（常见默认端口）
 * - 读取角色模板（dhtclient/dhtserver）与网络节点清单（custom.json）
 * - 依据当前 Peer 身份生成 Announce/Bootstrap/Peering 等配置并通过 HTTP API 替换运行时配置
 *
 * 设计原则：
 * - 保守覆盖：仅在模板明确给定时更新字段；保留现有 Swarm 等数组
 * - 可调参数：通过源代码常量调整端口与邻居选择规模，适配 100 节点规模
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { RequestInit } from "undici";
import mp from "../mp.js";
import { isIP } from "net";
import { resolve4, resolve6 } from "dns/promises";

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
 * 从链上合约读取的 Dot 结构
 */
type Dot = {
  address: string;
  name: string;
  APIs: string[];
  CIDs: string[];
  lastUpdate: number;
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

// 参数常量（为 100 节点规模提供合理默认值）
// DEFAULT_PORT：Swarm 端口默认值（TCP/QUIC 共用）
const DEFAULT_PORT = 4001;
// BOOTSTRAP_K：作为 Bootstrap 的 dhtserver 数量上限
const BOOTSTRAP_K = 8;
// PEERING_RING：环形邻居，左右各多少个（不含自身）
const PEERING_RING = 3;
// PEERING_RANDOM：额外随机邻居数量（优先选择 dhtserver）
const PEERING_RANDOM = 3;

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
 * - 固定为 http://127.0.0.1:5001
 */
const detectApiBase = async (): Promise<string | null> => {
  const base = "http://127.0.0.1:5001";
  if (await isApiAlive(base)) return base;
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
 * 将 Dot.name 拆分为 { name, id }
 * 约定格式："<显示名>-<PeerID>"
 */
const splitDotName = (full: string): { name: string; id: string } => {
  const i = typeof full === "string" ? full.lastIndexOf("-") : -1;
  if (i > 0) return { name: full.slice(0, i), id: full.slice(i + 1) };
  return { name: full || "", id: "" };
};

/**
 * 将 APIs URL 列表转为基础 multiaddr（不含 /tcp、/udp、/p2p）
 * - IPv4: /ip4/<host>
 * - IPv6: /ip6/<host>
 * - 域名: /dns4/<host> 与 /dns6/<host>
 */
// DNS 记录检测缓存，避免重复解析
const dnsSupportCache = new Map<string, { v4: boolean; v6: boolean }>();

const getDnsSupport = async (
  host: string
): Promise<{ v4: boolean; v6: boolean }> => {
  const cached = dnsSupportCache.get(host);
  if (cached) return cached;
  let v4 = false;
  let v6 = false;
  try {
    const a = await resolve4(host);
    v4 = Array.isArray(a) && a.length > 0;
  } catch { }
  try {
    const aaaa = await resolve6(host);
    v6 = Array.isArray(aaaa) && aaaa.length > 0;
  } catch { }
  const flags = { v4, v6 };
  dnsSupportCache.set(host, flags);
  return flags;
};

const toMaBasesFromApis = async (apis: string[]): Promise<string[]> => {
  const out: string[] = [];
  for (const s of apis || []) {
    try {
      const u = new URL(s);
      const hostRaw = u.hostname || "";
      const host = hostRaw.replace(/^\[|\]$/g, ""); // 去掉 IPv6 方括号
      const kind = isIP(host);
      if (kind === 4) out.push(`/ip4/${host}`);
      else if (kind === 6) out.push(`/ip6/${host}`);
      else if (host) {
        const { v4, v6 } = await getDnsSupport(host);
        if (v4) out.push(`/dns4/${host}`);
        if (v6) out.push(`/dns6/${host}`);
        // 若均不可用，保底使用 dns4 以便后续 TCP 拨号仍可尝试
        if (!v4 && !v6) out.push(`/dns6/${host}`);
      }
    } catch {
      // 非法 URL，忽略
    }
  }
  return dedupe(out);
};

/**
 * 将链上 dots 转换为 custom 节点清单
 * - 优先沿用现有 custom.json 的 type/port
 * - 无历史记录时默认 type=dhtclient
 */
const dotsToCustom = async (dots: Dot[]): Promise<NodeDef[]> => {
  const result: NodeDef[] = [];
  for (const d of dots || []) {
    const { name, id } = splitDotName(d?.name || "");
    const ips = await toMaBasesFromApis(d?.APIs || []);
    result.push({ name, id, ip: ips, type: "dhtserver" });
  }
  return result;
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
      "未检测到可用的 IPFS HTTP API（常见端口 5001）。请确保守护进程已开启 HTTP API。"
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
  const dots = await mp.getAllDots();
  console.log('dots', dots);

  const dhtClientPath = path.join(NETWORK_ROOT, "dhtclient.json");
  const dhtServerPath = path.join(NETWORK_ROOT, "dhtserver.json");
  const custom = await dotsToCustom(dots as Dot[]);
  console.log('custom', custom);
  if (!Array.isArray(custom)) {
    throw new Error("生成的节点清单必须是数组");
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
