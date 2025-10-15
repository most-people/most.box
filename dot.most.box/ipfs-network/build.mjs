#!/usr/bin/env node
// 通过合并角色模板与节点清单生成 IPFS 配置
// 输入：custom.json、dhtclient.json、dhtserver.json
// 输出：从本地 IPFS API 获取当前配置与 Peer ID，按 custom.json 与角色模板进行细粒度合并，写入到 .ipfs/config

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NETWORK_ROOT = __dirname;
const OUT_SINGLE_ROOT = path.join(NETWORK_ROOT, ".ipfs");
// 环境变量调参（为 100 节点规模提供合理默认值）
const DEFAULT_PORT = Number(process.env.DEFAULT_PORT || 4001);
const BOOTSTRAP_K = Number(process.env.BOOTSTRAP_K || 8); // 作为 Bootstrap 的 dhtserver 数量
const PEERING_RING = Number(process.env.PEERING_RING || 3); // 环形邻居左右各多少个
const PEERING_RANDOM = Number(process.env.PEERING_RANDOM || 3); // 额外随机邻居数量

async function readJson(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON 解析失败：${filePath}：${e.message}`);
  }
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function addTcp(base, port = DEFAULT_PORT) {
  return `${base}/tcp/${port}`;
}

function addUdpQuic(base, port = DEFAULT_PORT) {
  return `${base}/udp/${port}/quic`;
}

function addP2pTcp(base, peerId, port = DEFAULT_PORT) {
  return `${addTcp(base, port)}/p2p/${peerId}`;
}

// 工具函数
function isDnsaddr(ma) {
  return typeof ma === "string" && ma.startsWith("/dnsaddr/");
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const v of list || []) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickK(arr, k) {
  if (k <= 0) return [];
  return shuffle(arr).slice(0, Math.min(k, arr.length));
}

function nodePort(node) {
  const p = node && node.port !== undefined ? Number(node.port) : DEFAULT_PORT;
  return Number.isFinite(p) && p > 0 ? p : DEFAULT_PORT;
}

// 将基础 multiaddr 规范化为可拨号地址（不带 /p2p），用于 Peering.Addrs
function normalizeNoP2p(base, port) {
  if (isDnsaddr(base)) return [base];
  const p = port || DEFAULT_PORT;
  return [addTcp(base, p), addUdpQuic(base, p)];
}

// 将基础 multiaddr 规范化为可拨号地址（带 /p2p），用于 Bootstrap 条目
function normalizeWithP2p(base, peerId, port) {
  if (isDnsaddr(base)) return [base];
  const p = port || DEFAULT_PORT;
  return [addP2pTcp(base, peerId, p), `${addUdpQuic(base, p)}/p2p/${peerId}`];
}

function buildAnnounce(ipList, port = DEFAULT_PORT) {
  const out = [];
  for (const ip of ipList || []) {
    for (const a of normalizeNoP2p(ip, port)) out.push(a);
  }
  return dedupe(out);
}

// Bootstrap：仅选择 dhtserver 节点，限制为 BOOTSTRAP_K 个，并包含 TCP 与 QUIC 的 /p2p 地址
function buildBootstrap(nodes) {
  const servers = (nodes || []).filter(
    (n) => n && n.type === "dhtserver" && Array.isArray(n.ip) && n.ip.length > 0
  );
  const selected = pickK(servers, BOOTSTRAP_K);
  const out = [];
  for (const node of selected) {
    const p = nodePort(node);
    for (const ip of node.ip) {
      for (const a of normalizeWithP2p(ip, node.id, p)) out.push(a);
    }
  }
  return dedupe(out);
}

// Peering：针对本地节点，选择环形邻居 + 随机邻居，生成 TCP 与 QUIC 地址（不带 /p2p）
function buildPeeringForLocal(nodes, localPeerId) {
  const arr = Array.isArray(nodes) ? nodes.slice() : [];
  const idx = arr.findIndex((n) => n && n.id === localPeerId);
  const N = arr.length;

  function at(i) {
    return arr[((i % N) + N) % N];
  }

  const chosen = new Map(); // id -> node
  if (N > 0 && idx >= 0) {
    // 环形邻居
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
  const peers = [];
  for (const node of chosen.values()) {
    const p = nodePort(node);
    const addrs = [];
    for (const ip of node.ip || []) {
      for (const a of normalizeNoP2p(ip, p)) addrs.push(a);
    }
    const deduped = dedupe(addrs);
    if (deduped.length > 0) {
      peers.push({ ID: node.id, Addrs: deduped });
    }
  }
  return peers;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function mergeObjects(target, source) {
  if (!source || typeof source !== "object") return target;
  if (!target || typeof target !== "object") target = {};
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (Array.isArray(sv)) {
      // 对数组采用保守策略：若目标不存在则使用模板；若存在则保留目标
      if (tv === undefined) {
        target[key] = deepClone(sv);
      }
    } else if (sv && typeof sv === "object") {
      target[key] = mergeObjects(tv && typeof tv === "object" ? tv : {}, sv);
    } else {
      target[key] = sv;
    }
  }
  return target;
}

function mergeBaseWithExtras(
  baseCfg,
  { announceAddrs, bootstrapAddrs, peeringPeers, roleCfg }
) {
  const cfg = deepClone(baseCfg);

  // Addresses：保留现有 Swarm，不覆盖；仅设置 Announce
  cfg.Addresses = cfg.Addresses || {};
  cfg.Addresses.Announce = announceAddrs;

  // Bootstrap 列表（来自 custom.json）
  cfg.Bootstrap = bootstrapAddrs;

  // Peering 列表（来自 custom.json）
  cfg.Peering = { Peers: peeringPeers };

  // Routing.Type 按模板角色设置
  cfg.Routing = cfg.Routing || {};
  if (roleCfg && roleCfg.Routing && roleCfg.Routing.Type) {
    cfg.Routing.Type = roleCfg.Routing.Type;
  }

  // 细粒度合并：将角色模板中的 Swarm / Pubsub / Reprovider 合并到当前配置
  if (roleCfg) {
    if (roleCfg.Swarm) {
      cfg.Swarm = mergeObjects(cfg.Swarm || {}, roleCfg.Swarm);
    }
    if (roleCfg.Pubsub) {
      cfg.Pubsub = mergeObjects(cfg.Pubsub || {}, roleCfg.Pubsub);
    }
    if (roleCfg.Reprovider) {
      cfg.Reprovider = mergeObjects(cfg.Reprovider || {}, roleCfg.Reprovider);
    }
  }

  return cfg;
}

async function fetchJson(url) {
  try {
    const res = await axios.post(url, null, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      responseType: "json",
      // 如需允许自签名或非严格校验，可在此调整；默认保持安全。
      // 通过 validateStatus 允许我们显式处理所有状态码。
      validateStatus: () => true,
    });
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`HTTP 状态 ${res.status}：${url}`);
    }
    return res.data;
  } catch (err) {
    // 归一化错误信息
    const msg = err && err.message ? err.message : String(err);
    throw new Error(`请求失败：${url}：${msg}`);
  }
}

async function getCurrentIpfsInfo(apiBase = "http://127.0.0.1:5001") {
  const cfgUrl = new URL("/api/v0/config/show", apiBase).toString();
  const idUrl = new URL("/api/v0/id", apiBase).toString();
  const [config, idResp] = await Promise.all([
    fetchJson(cfgUrl),
    fetchJson(idUrl),
  ]);
  const peerId = idResp && (idResp.ID || idResp.Id || idResp.id);
  if (!peerId) {
    throw new Error("无法从 IPFS API /api/v0/id 获取 Peer ID");
  }
  return { config, peerId };
}

async function main() {
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
  const bootstrapAddrs = buildBootstrap(custom);

  // 仅默认模式：获取当前 IPFS 配置与 peer id，按 custom.json 与角色模板进行更细粒度合并
  try {
    const { config: currentCfg, peerId } = await getCurrentIpfsInfo(
      process.env.IPFS_API_BASE || "http://127.0.0.1:5001"
    );

    const matched = custom.find((n) => n.id === peerId);
    const roleCfg =
      matched && matched.type === "dhtserver" ? dhtServer : dhtClient;
    const announceAddrs = buildAnnounce(
      matched ? matched.ip : [],
      matched ? nodePort(matched) : DEFAULT_PORT
    );
    // Peering: neighbors + random (no /p2p)
    const peeringPeers = buildPeeringForLocal(custom, peerId);

    const finalCfg = mergeBaseWithExtras(currentCfg, {
      announceAddrs,
      bootstrapAddrs,
      peeringPeers,
      roleCfg,
    });

    await ensureDir(OUT_SINGLE_ROOT);
    const outFile = path.join(OUT_SINGLE_ROOT, "config");
    await fs.writeFile(
      outFile,
      JSON.stringify(finalCfg, null, 2) + "\n",
      "utf8"
    );
    console.log(
      `已生成 ${path.relative(NETWORK_ROOT, outFile)}，本地 Peer：${peerId}（${
        matched ? matched.name : "未知"
      }）\n` +
        `Bootstrap 条目数：${bootstrapAddrs.length}，Peering 固定邻居数：${peeringPeers.length}，Announce 条目数：${announceAddrs.length}`
    );
  } catch (err) {
    console.error("错误：从 IPFS API 获取当前配置 / Peer ID 失败。", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("生成 IPFS 配置出错：", err);
  process.exit(1);
});
