IPFS 网络配置生成器（ipfs-network）

概述

- 通过 build.mjs 从 custom.json + 角色模板（dhtclient.json/dhtserver.json）生成本地 .ipfs/config。
- 优化策略适配 100 节点规模：
  - Bootstrap 仅选择少量稳定 dhtserver 节点（默认 8 个），并包含 TCP 与 QUIC 两类 /p2p 地址。
  - Peering 采用“环形 + 随机跳”邻居集合（默认左右各 3 个 + 随机 3 个），避免全量固定连接导致资源耗尽。
  - Announce 地址按节点 IP 或 /dnsaddr 自动生成并去重，可按节点指定 port。

环境变量（可选）

- DEFAULT_PORT：默认生成地址的端口（默认 4001）。
- BOOTSTRAP_K：Bootstrap 选择的 dhtserver 数量（默认 8）。
- PEERING_RING：环形邻居左右各多少个（默认 3）。
- PEERING_RANDOM：额外随机邻居数量（默认 3）。
- IPFS_API_BASE：IPFS API 地址（默认 http://127.0.0.1:5001）。

custom.json Schema 扩展（可选）

- 每个节点支持附加字段 port：
  ```json
  {
    "name": "SG1",
    "type": "dhtserver",
    "id": "...",
    "ip": ["/ip4/129.226.147.127", "/dns4/sg1.most-people.com"],
    "port": 4001
  }
  ```
- 若使用 /dnsaddr，例如 "/dnsaddr/sg1.most-people.com"，脚本将直接使用该域名，避免端口拼装与 IP 变更导致配置陈旧。

使用步骤

1. 启动本地 IPFS（确保 API 可访问），或设置 IPFS_API_BASE。
2. 运行生成脚本：
   ```bash
   node dot.most.box/ipfs-network/build.mjs
   ```
   完成后输出文件位于：dot.most.box/ipfs-network/.ipfs/config

连通性自检（可选）

- 提供脚本：scripts/check-connectivity.mjs
  - 功能：打印本地 Peer ID、Swarm peers 数量、Bootstrap/Peering/Announce 条目数、部分示例 peer 与本地地址。
  - 使用：
    ```bash
    node dot.most.box/ipfs-network/scripts/check-connectivity.mjs
    ```
  - 如需指定 API 地址：
    ```bash
    IPFS_API_BASE=http://127.0.0.1:5001 node dot.most.box/ipfs-network/scripts/check-connectivity.mjs
    ```

策略说明与实践建议

- dhtserver：稳定、可公网访问、启用 RelayService；水位较高，承担骨干角色。
- dhtclient：启用 RelayClient 与 AutoRelay；水位较低，减少硬固定连接数量。
- Peering：每节点保持 6–9 个固定直连，避免“全连全”，其余通过 DHT/中继动态扩展。
- 地理就近与 /dnsaddr：尽量选择就近邻居，推荐为节点配置 /dnsaddr 以简化地址维护。

验证指标

- 关注 ipfs swarm peers 的数量与变化趋势、连接重试与延迟分布、PubSub 覆盖率及 Bitswap 吞吐等。
- 建议先稳定 3–5 个中继与 5–10 个 dhtserver 的骨干，再逐步扩容到 100 节点。
