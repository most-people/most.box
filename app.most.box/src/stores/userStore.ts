import mp from "@/constants/mp";
import { type MostWallet } from "@/constants/MostWallet";
import { create } from "zustand";
import { api } from "@/constants/api";
import { notifications } from "@mantine/notifications";
import { NETWORK_CONFIG, type NETWORK_TYPE } from "@/constants/dot";

export interface FileItem {
  name: string;
  type: "file" | "directory";
  size: number;
  cid: {
    "/": string;
  };
}
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

export interface Note {
  name: string;
  cid: string;
}

interface UserStore {
  wallet?: MostWallet;
  initWallet: (fingerprint: string) => void;
  updateDot: (url: string, first?: boolean) => Promise<string[] | null>;
  firstPath: string;
  dotAPI: string;
  dotCID: string;
  dotNodes: DotNode[];
  // 笔记
  notes?: Note[];
  nodeDark: "toastui-editor-dark" | "";
  notesQuery: string;
  // 文件系统
  files?: FileItem[];
  filesPath: string;
  fingerprint: string;
  rootCID: string;
  updateCID: () => Promise<string[] | null>;
  // 区块链网络
  network: NETWORK_TYPE;
  setNetwork: (network: NETWORK_TYPE) => void;
  RPC: string;
  Explorer: string;
  // 退出
  exit: () => void;
}

interface State extends UserStore {
  setItem: <K extends keyof State>(key: K, value: State[K]) => void;
}

export const useUserStore = create<State>((set, get) => ({
  wallet: undefined,
  initWallet(fingerprint: string) {
    set({ fingerprint });
    const jwt = localStorage.getItem("jwt");
    if (jwt) {
      try {
        const wallet = mp.verifyJWT(jwt);
        if (wallet) {
          mp.createToken(wallet);
          set({ wallet });
        }
      } catch (error) {
        notifications.show({ message: "登录过期", color: "red" });
        console.warn("登录过期", error);
        get().exit();
      }
    }
  },
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
      set({ notes: undefined, files: undefined });
      return dot.APIs;
    } catch (error) {
      console.info(error);
      set({ dotAPI: api.defaults.baseURL || "" });
    }
    return null;
  },
  setItem: (key, value) => set((state) => ({ ...state, [key]: value })),
  firstPath: "",
  dotAPI: "",
  dotCID: "",
  dotNodes: [],
  notes: undefined,
  notesQuery: "",
  nodeDark: "",
  files: undefined,
  filesPath: "",
  fingerprint: "",
  rootCID: "",
  async updateCID() {
    return null;
  },
  exit() {
    set({ wallet: undefined, notes: undefined, files: undefined });
    localStorage.removeItem("jwt");
    localStorage.removeItem("token");
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
    notifications.show({
      title: "网络已切换",
      message: `已切换到 ${config.name}`,
      color: config.color,
    });
  },
}));
