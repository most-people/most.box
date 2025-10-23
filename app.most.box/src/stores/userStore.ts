import mp from "@/constants/mp";
import {
  mostDecode,
  mostEncode,
  type MostWallet,
} from "@/constants/MostWallet";
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
  updateRootCID: () => Promise<void>;
  getRootCID: () => Promise<void>;
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
  async updateRootCID() {
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

      const [res, encodeCID] = await Promise.all([
        api.post("/files.cid"),
        contract.getCID(wallet.address),
      ]);
      const cid = res.data;
      const rootCID = mostDecode(
        encodeCID,
        wallet.public_key,
        wallet.private_key
      );
      if (cid && cid !== rootCID) {
        const encodeCID = mostEncode(
          cid,
          wallet.public_key,
          wallet.private_key
        );
        const tx = await contract.setCID(encodeCID);
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
      const [res, encodeCID] = await Promise.all([
        api.post("/files.cid"),
        contract.getCID(wallet.address),
      ]);
      const rootCID = mostDecode(
        encodeCID,
        wallet.public_key,
        wallet.private_key
      );
      if (rootCID) {
        if (rootCID === res.data) {
          set({ rootCID });
        } else {
          // 导入根目录 CID
          const res = await api.put(`/files.import/${rootCID}`);
          if (res.data.ok) {
            set({ rootCID });
          } else {
            notifications.show({
              message: "根目录 CID 导入失败",
              color: "red",
            });
          }
        }
      }
    }
  },
  // 通用设置器
  setItem: (key, value) => set((state) => ({ ...state, [key]: value })),
}));
