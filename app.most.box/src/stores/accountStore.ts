import { create } from "zustand";
import { BrowserProvider, getAddress, type Signer } from "ethers";

interface AccountState {
  ethereum: object | null;
  signer: Signer | null;
  account: string;
  connectOKX: () => Promise<Signer | null>;
  disconnect: () => void;
  initAccount: () => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  ethereum: null,
  signer: null,
  account: "",
  disconnect: () => {
    set({ account: "", signer: null });
  },
  // 连接钱包地址
  async connectOKX() {
    // @ts-expect-error window.ethereum
    const provider = window.ethereum;
    if (provider) {
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      if (accounts && accounts.length > 0) {
        const account = getAddress(accounts[0]);
        const ethersProvider = new BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        set({ account, signer });
        return signer;
      }
    } else {
      throw new Error("请先安装 OKX wallet");
    }
    return null;
  },
  // 监听钱包地址变化
  async initAccount() {
    // @ts-expect-error window.ethereum
    const ethereum = window?.ethereum;
    if (ethereum) {
      set({ ethereum });
      ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          const account = getAddress(accounts[0]);
          set({ account });
          return account;
        } else {
          get().disconnect();
        }
      });
    }
  },
}));
