import mp from "@/constants/mp";
import { type MostWallet } from "@/constants/MostWallet";
import { create } from "zustand";
import { notifications } from "@mantine/notifications";
import { CONTRACT_ABI_NAME, CONTRACT_ADDRESS_NAME } from "@/constants/dot";
import { api } from "@/constants/api";
import { Contract, HDNodeWallet, JsonRpcProvider } from "ethers";
import { useDotStore } from "@/stores/dotStore";

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
  wallet?: MostWallet;
  initWallet: (fingerprint: string) => void;
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
  setRootCID: () => Promise<void>;
  getRootCID: () => Promise<string>;
}

interface State extends UserStore {
  setItem: <K extends keyof State>(key: K, value: State[K]) => void;
}

export const useUserStore = create<State>((set, get) => ({
  // 钱包
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
          get().getRootCID();
        }
      } catch (error) {
        notifications.show({ message: "登录过期", color: "red" });
        console.warn("登录过期", error);
        get().exit();
      }
    }
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
  async setRootCID() {
    const { wallet } = get();
    if (wallet) {
      const { RPC } = useDotStore.getState();
      const provider = new JsonRpcProvider(RPC);
      const signer = HDNodeWallet.fromPhrase(wallet.mnemonic).connect(provider);
      const contract = new Contract(
        CONTRACT_ADDRESS_NAME,
        CONTRACT_ABI_NAME,
        signer
      );
      const [res, rootCID] = await Promise.all([
        api.post("/files.cid"),
        contract.getCID(wallet.address),
      ]);
      const cid = res.data;
      if (cid && cid !== rootCID) {
        const tx = await contract.setCID(cid);
        await tx.wait();
        set({ rootCID: cid });
      }
    }
  },
  async getRootCID() {
    const { wallet } = get();
    if (wallet) {
      const { RPC } = useDotStore.getState();
      const provider = new JsonRpcProvider(RPC);
      const contract = new Contract(
        CONTRACT_ADDRESS_NAME,
        CONTRACT_ABI_NAME,
        provider
      );
      const [res, rootCID] = await Promise.all([
        api.post("/files.cid"),
        contract.getCID(wallet.address),
      ]);
      const cid = res.data;
      if (cid === rootCID) {
        set({ rootCID: cid });
      } else {
      }
      return rootCID;
    }
  },
  // 通用设置器
  setItem: (key, value) => set((state) => ({ ...state, [key]: value })),
}));
