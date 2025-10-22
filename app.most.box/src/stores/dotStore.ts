import { create } from "zustand";
import { NETWORK_CONFIG, type NETWORK_TYPE } from "@/constants/dot";
import { api } from "@/constants/api";

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

export const useDotStore = create<State>((set, get) => ({
  // 节点
  dotAPI: "",
  dotCID: "",
  dotNodes: [],
  async updateDot(url) {
    try {
      const dotAPI = new URL(url).origin;
      const res = await api.get("/api.dot", { baseURL: dotAPI });
      const dot = res.data as Dot;
      api.defaults.baseURL = dotAPI;
      set({ dotAPI });
      localStorage.setItem("dotAPI", dotAPI);

      let dotCID = dot.CIDs[0];
      if (dotAPI.endsWith(":1976")) {
        dotCID = dotAPI.slice(0, -5) + ":8080";
      }
      if (dotCID) {
        set({ dotCID });
        localStorage.setItem("dotCID", dotCID);
      }
      return dot.APIs;
    } catch (error) {
      console.info(error);
      set({ dotAPI: api.defaults.baseURL || "" });
    }
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
