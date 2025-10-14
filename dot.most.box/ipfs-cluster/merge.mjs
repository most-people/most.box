import fs from 'fs';
import { fileURLToPath } from 'url';
import defaultJson from './default.json' with { type: 'json' };
import nodes from './custom.json' with { type: 'json' };

// 深度合并两个对象的函数
const deepMerge = (target, source) => {
    const result = { ...target };
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                // 如果是对象，递归合并
                result[key] = deepMerge(result[key] || {}, source[key]);
            } else {
                // 如果是基本类型或数组，直接覆盖
                result[key] = source[key];
            }
        }
    }

    return result;
}

// 根据 base multiaddress 构建 announce_multiaddress
const buildAnnounce = (ipBases) => {
  const out = [];
  for (const base of ipBases) {
    out.push(`${base}/tcp/9096`);
    out.push(`${base}/udp/9096/quic`);
  }
  return out;
};

// 构建 peer_addresses / bootstrap 以及 trusted_peers 列表
const buildClusterLists = (nodes) => {
  const peer_addresses = [];
  const trusted_peers = [];

  for (const n of nodes) {
    trusted_peers.push(n.id);
    for (const base of n.ip) {
      peer_addresses.push(`${base}/tcp/9096/p2p/${n.id}`);
      peer_addresses.push(`${base}/udp/9096/quic/p2p/${n.id}`);
    }
  }

  // bootstrap 与 peer_addresses 一致
  const bootstrap = [...peer_addresses];
  return { peer_addresses, bootstrap, trusted_peers };
};

// 由 custom.json 生成列表
const { peer_addresses, bootstrap, trusted_peers } = buildClusterLists(nodes);

// 读取并合并 secret.json（如果存在），用于覆盖 default.json 中的 cluster.secret
let secretPatch = {};
try {
  const secretUrl = new URL('./secret.json', import.meta.url);
  const secretPath = fileURLToPath(secretUrl);
  if (fs.existsSync(secretPath)) {
    const raw = fs.readFileSync(secretPath, 'utf-8');
    secretPatch = JSON.parse(raw);
  }
} catch (e) {
  // 忽略读取错误，保持默认配置
  secretPatch = {};
}

for (const n of nodes) {
  const patch = {
    cluster: {
      peername: n.name,
      announce_multiaddress: buildAnnounce(n.ip),
      peer_addresses,
      bootstrap,
    },
    consensus: {
      crdt: {
        trusted_peers,
      },
    },
  };

  // 先将 default 与 secret 合并，再覆盖节点 patch
  const baseConfig = deepMerge(defaultJson, secretPatch);
  const mergedConfig = deepMerge(baseConfig, patch);
  // 目标目录：ipfs-cluster/service/<name>/
  const outDirUrl = new URL(`./service/${n.name}/`, import.meta.url);
  const outDirPath = fileURLToPath(outDirUrl);
  fs.mkdirSync(outDirPath, { recursive: true });

  // 文件：service.json
  const outFileUrl = new URL('service.json', outDirUrl);
  const outFilePath = fileURLToPath(outFileUrl);
  fs.writeFileSync(outFilePath, JSON.stringify(mergedConfig, null, 2));
  console.log(`Generated: ${outFilePath}`);
}