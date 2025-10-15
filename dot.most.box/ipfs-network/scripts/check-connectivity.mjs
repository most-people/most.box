#!/usr/bin/env node
// 本地 IPFS 节点的快速连通性检查脚本
// 输出：Peer ID、Swarm peers 数量，以及配置指标（Bootstrap / Peering / Announce 的条目数）

import axios from "axios";

const API_BASE = process.env.IPFS_API_BASE || "http://127.0.0.1:5001";

async function apiPost(path) {
  // 以 POST 方式调用 IPFS HTTP API，返回 JSON
  const url = new URL(path, API_BASE).toString();
  const res = await axios.post(url, null, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    responseType: "json",
    validateStatus: () => true,
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`HTTP ${res.status} ${url}`);
  }
  return res.data;
}

function safeLen(v) {
  // 安全获取数组长度
  return Array.isArray(v) ? v.length : 0;
}

async function main() {
  // 主流程：依次查询 id、config、swarm peers、local addrs 并打印摘要
  try {
    const id = await apiPost("/api/v0/id");
    const cfg = await apiPost("/api/v0/config/show");
    const peersResp = await apiPost("/api/v0/swarm/peers");
    const localAddrs = await apiPost("/api/v0/swarm/addrs/local");

    const peerId = id && (id.ID || id.Id || id.id);
    const peers = peersResp && (peersResp.Peers || peersResp.peers || []);
    const peerCount = safeLen(peers);

    const bootstrapCount = safeLen(cfg && cfg.Bootstrap);
    const peeringPeers = cfg && cfg.Peering && (cfg.Peering.Peers || []);
    const peeringCount = safeLen(peeringPeers);
    const announceCount = safeLen(
      cfg && cfg.Addresses && cfg.Addresses.Announce
    );

    console.log("IPFS 连通性检查：");
    console.log(`- API 地址：${API_BASE}`);
    console.log(`- 本地 Peer ID：${peerId || "未知"}`);
    console.log(`- 当前 Swarm 连接数：${peerCount}`);
    console.log(`- Bootstrap 条目数：${bootstrapCount}`);
    console.log(`- Peering 固定邻居数：${peeringCount}`);
    console.log(`- Addresses.Announce 条目数：${announceCount}`);

    // 打印部分示例连接（最多 10 个），用于快速肉眼检查
    if (peerCount > 0) {
      const sample = peers.slice(0, 10);
      console.log("- 连接示例（最多展示 10 个）：");
      for (const p of sample) {
        const pid = p.Peer || p.ID || p.Id || p.id || "";
        const addr = p.Addr || p.addr || "";
        const dir = p.Direction || p.direction || "";
        console.log(`  * ${pid} ${addr} ${dir ? `(方向: ${dir})` : ""}`);
      }
    }

    // 打印本地地址（最多 10 个），用于核对 Announce/实际可达地址
    if (localAddrs && Array.isArray(localAddrs.Strings)) {
      console.log(
        `- 本地地址（共 ${localAddrs.Strings.length} 条，最多展示 10 条）：`
      );
      for (const a of localAddrs.Strings.slice(0, 10)) {
        console.log(`  * ${a}`);
      }
    }

    // 简单一致性提示：当关键列表为空时给出警告
    if (bootstrapCount === 0) {
      console.warn(
        "[警告] Bootstrap 为空。请考虑设置 BOOTSTRAP_K > 0，或在 custom.json 中确保存在可用的 dhtserver 节点。"
      );
    }
    if (peeringCount === 0) {
      console.warn(
        "[警告] Peering.Peers 为空。小网络可以正常运行，但为了稳定性，建议配置环形 + 随机的固定邻居。"
      );
    }
  } catch (err) {
    console.error(
      "连通性检查失败：",
      err && err.message ? err.message : String(err)
    );
    process.exit(1);
  }
}

main();
