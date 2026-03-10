// API Configuration
export const API_PREFIX_URL = "https://api.most.box/api";
export const API_LOCAL_PREFIX_URL = "http://localhost:8787/api";

// Thirdweb
// Thirdweb Client ID https://thirdweb.com/dashboard/settings/api-keys
export const THIRDWEB_CLIENT_ID = "35e78b1757357d0969058cfe8bb24e36";

// IndexedDB
export const DB_NAME = "most-box-db";
export const STORE_NAME = "keyvaluepairs";

// Wallet / Encryption
export const PBKDF2_ITERATIONS = 3;

// Crust Network
// Subscan 浏览器
export const CRUST_SUBSCAN = "https://crust.subscan.io";
// Crust Pinning 服务
export const CRUST_PIN = "https://pin.crustcode.com";
// Subscan 浏览器 API
export const CRUST_SUBSCAN_API = "https://crust.api.subscan.io";
// 批量交易数量限制
export const CRUST_BATCH_LIMIT = 50;

// Crust IPFS Web3 Auth 网关
export const CRUST_IPFS_GWS = [
  "https://ipfs-gw.decloud.foundation",
  "https://gw.crustfiles.app",
  // "https://gw.crustfiles.net",
];

// Crust 链 RPC 节点列表
export const CRUST_RPC_NODES = [
  "wss://rpc.crust.network",
  "wss://rpc-crust-mainnet.decoo.io",
  "wss://api.decloudf.com",
  "wss://crust.api.onfinality.io/public-ws",
];

export type GatewayInfo = {
  key: string;
  title: string;
  description: string;
  gateways: string[];
};

// IPFS Gateways
export const IPFS_GATEWAY_LIST: GatewayInfo[] = [
  {
    key: "custom",
    title: "自定义网关",
    description: "用户自定义的 IPFS 网关",
    gateways: ["https://mp9.io", "http://localhost:8080"],
  },
  {
    key: "thirdweb",
    title: "Thirdweb 加速",
    description: "由 Thirdweb 提供的全球 CDN 加速网关",
    gateways: [`https://${THIRDWEB_CLIENT_ID}.ipfscdn.io`],
  },
  {
    key: "crust",
    title: "Crust 官方网关",
    description: "由 Crust Network 提供的高速稳定网关",
    gateways: [
      "https://gw.crust-gateway.xyz",
      // "https://gw.crust-gateway.com"
    ],
  },
  {
    key: "public",
    title: "公共网关",
    description: "由社区或第三方服务商提供的公共网关",
    gateways: [
      "https://cid.most.red",
      "https://ipfs.io",
      "https://dweb.link",
      "https://gateway.pinata.cloud",
      "https://ipfs.filebase.io",
      "https://w3s.link",
      "https://4everland.io",
      "https://apac.orbitor.dev",
      "https://eu.orbitor.dev",
      "https://latam.orbitor.dev",
      "https://dget.top",
    ],
  },
];

// File Upload
export const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

// Misc
export const BASE36_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
