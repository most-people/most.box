import {
  mostDecode,
  mostEncode,
  type MostWallet,
} from "@/constants/MostWallet";
import { create } from "zustand";
import { notifications } from "@mantine/notifications";
import { CONTRACT_ABI_NAME, CONTRACT_ADDRESS_NAME } from "@/constants/dot";
import { api } from "@/constants/api";
import { Contract, formatEther, HDNodeWallet, JsonRpcProvider } from "ethers";
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
  initRootCID: () => Promise<void>;
  updateRootCID: () => Promise<void>;
  // 余额
  balance: string;
  initBalance: () => Promise<void>;
}

interface State extends UserStore {
  setItem: <K extends keyof State>(key: K, value: State[K]) => void;
}

export const useUserStore = create<State>((set, get) => ({
  // 钱包
  wallet: undefined,
  setWallet(wallet: MostWallet) {
    set({ wallet });
    const { initRootCID, initBalance } = get();
    initRootCID();
    initBalance();
    // 自动获取测试网 Gas
    // api.post("/api.testnet.gas");
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
        api.post("/files.root.cid"),
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
  async initRootCID() {
    const { wallet } = get();
    if (!wallet) return console.log("未登录");

    const { RPC } = useDotStore.getState();
    const provider = new JsonRpcProvider(RPC);
    const contract = new Contract(
      CONTRACT_ADDRESS_NAME,
      CONTRACT_ABI_NAME,
      provider
    );
    const [res, encodeCID] = await Promise.all([
      api.post("/files.root.cid"),
      contract.getCID(wallet.address),
    ]);
    const cid = res.data;
    const rootCID = mostDecode(
      encodeCID,
      wallet.public_key,
      wallet.private_key
    );
    if (rootCID) {
      if (rootCID === cid) {
        set({ rootCID });
      } else {
        // 导入根目录 CID
        try {
          await api({
            method: "put",
            url: "/files.import",
            params: {
              cid: rootCID,
            },
          });

          set({ rootCID });
        } catch (error) {
          notifications.show({
            message: "根目录 CID 导入失败",
            color: "red",
          });
        }
      }
    }
  },
  // 余额
  balance: "",
  async initBalance() {
    const { wallet } = get();
    if (!wallet) return console.log("未登录");

    const { RPC } = useDotStore.getState();
    const provider = new JsonRpcProvider(RPC);
    const balance = await provider.getBalance(wallet.address);
    set({ balance: formatEther(balance) });

    if (Number(balance) === 0) {
      api.post("/api.testnet.gas");
    }
  },
  // 通用设置器
  setItem: (key, value) => set((state) => ({ ...state, [key]: value })),
}));
