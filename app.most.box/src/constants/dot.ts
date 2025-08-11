import { type DotNode } from "@/stores/userStore";
import { Contract, JsonRpcProvider } from "ethers";

// 合约配置
export const CONTRACT_ADDRESS = "0xdc82cef1a8416210afb87caeec908a4df843f016";

// 网络配置
export const NETWORK_CONFIG = {
  mainnet: {
    rpc: "https://mainnet-preconf.base.org",
    name: "Base 主网",
    color: "blue",
    explorer: "https://basescan.org",
  },
  testnet: {
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

// 从合约中获取所有 Dot 节点的信息
export const getDotNodes = async (rpc?: string): Promise<DotNode[] | null> => {
  try {
    const provider = new JsonRpcProvider(rpc || NETWORK_CONFIG["mainnet"].rpc);
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    const [addresses, names, timestamps] = await contract.getAllDots();

    const nodePromises = addresses.map(
      async (address: string, index: number) => {
        const [name, APIs, CIDs, update] = await contract.getDot(address);
        return {
          address,
          name: name || names[index] || `节点 ${index + 1}`,
          APIs: APIs || [],
          CIDs: CIDs || [],
          lastUpdate: Number(update || timestamps[index]),
        };
      }
    );

    const nodeList = await Promise.all(nodePromises);
    localStorage.setItem("dotNodes", JSON.stringify(nodeList));
    return nodeList;
  } catch (err) {
    console.error("获取节点列表失败:", err);
  }
  return null;
};
