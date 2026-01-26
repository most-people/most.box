import { getCrustBalance } from "@/utils/crust";
import { mostCrust, type MostWallet } from "@/utils/MostWallet";
import { create } from "zustand";

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

interface UserStore {
  dotAPI: string;
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
  // 根目录
  rootCID: string;
  // 余额
  balance: string;
  initBalance: () => Promise<void>;
}

interface State extends UserStore {
  setItem: <K extends keyof State>(key: K, value: State[K]) => void;
}

export const useUserStore = create<State>((set, get) => ({
  dotAPI: "",
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
  // 根目录 CID
  rootCID: "",
  // 余额
  balance: "",
  async initBalance() {
    const { wallet } = get();
    if (wallet) {
      try {
        // const { crust_address } = await mostCrust(wallet.danger);
        // const balance = await getCrustBalance(crust_address);
        // set({ balance });
      } catch (error) {
        console.error("获取 Crust 余额失败", error);
      }
    }
  },
  // 通用设置器
  setItem: (key, value) => set((state) => ({ ...state, [key]: value })),
}));
