// 合约配置
export const CONTRACT_ADDRESS = "0xdc82cef1a8416210afb87caeec908a4df843f016";

// 网络配置
export const NETWORK_CONFIG = {
  mainnet: {
    chainId: 8453,
    rpc: "https://mainnet.base.org",
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
      { internalType: "address[]", name: "addresses", type: "address[]" },
      { internalType: "string[]", name: "names", type: "string[]" },
      { internalType: "uint256[]", name: "timestamps", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "dot", type: "address" }],
    name: "getDot",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string[]", name: "APIs", type: "string[]" },
      { internalType: "string[]", name: "CIDs", type: "string[]" },
      { internalType: "uint256", name: "update", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
];
