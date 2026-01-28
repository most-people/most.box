import { getCrustBalance } from "@/utils/crust";
import { mostCrust, type MostWallet } from "@/utils/MostWallet";
import { create } from "zustand";

import { Contract, JsonRpcProvider } from "ethers";

export interface FileItem {
  name: string;
  type: "file" | "directory";
  size: number;
  cid: {
    "/": string;
  };
}

export interface Note {
  name: string;
  cid: string;
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

interface UserStore {
  wallet?: MostWallet;
  setWallet: (wallet: MostWallet) => void;
  firstPath: string;
  // 笔记
  notes?: Note[];
  nodeDark: "toastui-editor-dark" | "";
  notesQuery: string;
  // 文件
  files?: FileItem[];
  filesPath: string;
  fingerprint: string;
  // 退出登录
  exit: () => void;
  // 余额
  balance: string;
  initBalance: () => Promise<void>;
  // IPFS 网关
  dotCID: string;
}

interface State extends UserStore {
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

export const useUserStore = create<State>((set, get) => ({
  // 钱包
  wallet: undefined,
  setWallet(wallet: MostWallet) {
    set({ wallet });
    get().initBalance();
  },
  // 返回
  firstPath: "",
  // 笔记
  notes: undefined,
  notesQuery: "",
  nodeDark: "",

  // 文件系统
  files: undefined,
  filesPath: "",
  fingerprint: "",
  exit() {
    set({ wallet: undefined, notes: undefined, files: undefined });
    localStorage.removeItem("jwt");
    localStorage.removeItem("token");
  },
  // 余额
  balance: "",
  async initBalance() {
    const { wallet } = get();
    if (wallet) {
      try {
        const { crust_address } = await mostCrust(wallet.danger);
        const balance = await getCrustBalance(crust_address);
        set({ balance });
      } catch (error) {
        console.error("获取 Crust 余额失败", error);
      }
    }
  },
  // IPFS 网关
  dotCID: "",
  // 通用设置器
  setItem: (key, value) => set((state) => ({ ...state, [key]: value })),
}));
