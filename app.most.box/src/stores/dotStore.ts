import { create } from "zustand";
import {
  CONTRACT_ABI_DOT,
  CONTRACT_ADDRESS_DOT,
  NETWORK_CONFIG,
  type NETWORK_TYPE,
} from "@/utils/dot";
import { Contract, JsonRpcProvider } from "ethers";

export interface Dot {
  name: string;
  APIs: string[];
  CIDs: string[];
}

export interface DotNode extends Dot {
  address: string;
  lastUpdate: number;
  isOnline?: boolean;
  responseTime?: number;
}

interface DotState {
  // 节点
  dotAPI: string;
  dotCID: string;
  dotNodes: DotNode[];
  fetchNodes: (rpc?: string) => Promise<DotNode[]>;
  updateDot: (url: string, first?: boolean) => Promise<string[] | null>;
  // 区块链网络
  network: NETWORK_TYPE;
  RPC: string;
  Explorer: string;
  setNetwork: (network: NETWORK_TYPE) => void;
  // 通用设置器
  setItem: <K extends keyof DotState>(key: K, value: DotState[K]) => void;
}

interface State extends DotState {
  setItem: <K extends keyof State>(key: K, value: State[K]) => void;
}
export const checkNode = (
  node: DotNode,
): Promise<{ isOnline: boolean; responseTime: number }> => {
  return new Promise((resolve) => {
    if (!node.APIs || node.APIs.length === 0) {
      resolve({ isOnline: false, responseTime: 0 });
      return;
    }

    const nodeUrl = node.APIs[0];
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    fetch(`${nodeUrl}/api.dot`, {
      signal: controller.signal,
      mode: "cors",
    })
      .then(() => {
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        resolve({ isOnline: true, responseTime });
      })
      .catch(() => {
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        resolve({ isOnline: false, responseTime });
      });
  });
};

export const useDotStore = create<State>((set, get) => ({
  // 节点
  dotAPI: "",
  dotCID: "",
  dotNodes: [],
  fetchNodes: async (rpc?: string) => {
    const { RPC } = get();
    const provider = new JsonRpcProvider(rpc || RPC);
    const contract = new Contract(
      CONTRACT_ADDRESS_DOT,
      CONTRACT_ABI_DOT,
      provider,
    );
    const [addresses, names, APIss, CIDss, updates] =
      await contract.getAllDots();
    const nodes: DotNode[] = addresses.map((address: string, index: number) => {
      return {
        address,
        name: names[index] || `节点 ${index + 1}`,
        APIs: APIss[index] || [],
        CIDs: CIDss[index] || [],
        lastUpdate: Number(updates[index]),
      };
    });
    return nodes;
  },
  async updateDot(url: string) {
    return null;
  },
  // 网络相关状态
  network: "testnet",
  RPC: NETWORK_CONFIG["testnet"].rpc,
  Explorer: NETWORK_CONFIG["testnet"].explorer,
  setNetwork(network: NETWORK_TYPE) {
    const config = NETWORK_CONFIG[network];
    set({
      network,
      RPC: config.rpc,
      Explorer: config.explorer,
    });
    localStorage.setItem("network", network);
  },
  // 通用设置器
  setItem: (key, value) => set((state) => ({ ...state, [key]: value })),
}));
