// https://chainlist.org/rpcs.json
// import rpcs from "@/assets/json/rpcs.json";
// rpcs.find((e) => e.chainId === 8453).rpc.map((e: { url: string }) => e.url).filter((e: string) => e.startsWith("http"));

const RPCs = [
  "https://base.llamarpc.com",
  "https://mainnet.base.org",
  "https://developer-access-mainnet.base.org",
  "https://base-mainnet.diamondswap.org/rpc",
  "https://base.public.blockpi.network/v1/rpc/public",
  "https://1rpc.io/base",
  "https://base-pokt.nodies.app",
  "https://base.meowrpc.com",
  "https://base-mainnet.public.blastapi.io",
  "https://base.gateway.tenderly.co",
  "https://gateway.tenderly.co/public/base",
  "https://rpc.notadegen.com/base",
  "https://base-rpc.publicnode.com",
  "https://base.drpc.org",
  "https://base.api.onfinality.io/public",
  "https://public.stackup.sh/api/v1/node/base-mainnet",
  "https://base-mainnet.gateway.tatum.io",
  "https://base.rpc.subquery.network/public",
  "https://api.zan.top/base-mainnet",
  "https://endpoints.omniatech.io/v1/base/mainnet/public",
  "https://base.lava.build",
  "https://rpc.numa.network/base",
  "https://node.histori.xyz/base-mainnet/8ry9f6t9dct1se2hlagxnd9n2a",
  "https://0xrpc.io/base",
  "https://rpc.owlracle.info/base/70d38ce1826c4a60bb2a8e05a6c8b20f",
  "https://base.therpc.io",
];

// 合约配置
export const CONTRACT_ADDRESS = "0xdc82cef1a8416210afb87caeec908a4df843f016";

export const randomRPC = () => RPCs[Math.floor(Math.random() * RPCs.length)];

// 网络配置
export const NETWORK_CONFIG = {
  mainnet: {
    chainId: 8453,
    rpc: randomRPC(),
    name: "Base 主网",
    color: "blue",
    explorer: "https://basescan.org",
  },
  testnet: {
    chainId: 84532,
    rpc: "https://sepolia.base.org",
    name: "Base 测试网",
    color: "orange",
    explorer: "https://sepolia.basescan.org",
  },
};

// DotContract ABI
export const CONTRACT_ABI = [
  {
    inputs: [],
    name: "getAllDots",
    outputs: [
      {
        internalType: "address[]",
        name: "addresses",
        type: "address[]",
      },
      {
        internalType: "string[]",
        name: "names",
        type: "string[]",
      },
      {
        internalType: "string[][]",
        name: "APIss",
        type: "string[][]",
      },
      {
        internalType: "string[][]",
        name: "CIDss",
        type: "string[][]",
      },
      {
        internalType: "uint256[]",
        name: "updates",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
