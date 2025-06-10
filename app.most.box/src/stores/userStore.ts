import mp from "@/constants/mp";
import { type MostWallet } from "@/constants/MostWallet";
import { create } from "zustand";

export interface People {
  value: string;
  timestamp: number;
}

export interface NotifyValue {
  type: "friend" | "topic";
  username: string;
  public_key: string;
  text: string;
}

export interface Notify {
  sig: string;
  timestamp: number;
  value: NotifyValue;
}

interface UserStore {
  wallet?: MostWallet;
  initWallet: () => void;
  exit: () => void;
  firstPath: string;
}

interface State extends UserStore {
  setItem: <K extends keyof State>(key: K, value: State[K]) => void;
}

export const useUserStore = create<State>((set) => ({
  wallet: undefined,
  initWallet() {
    const token = localStorage.getItem("token");
    const tokenSecret = localStorage.getItem("tokenSecret");
    if (token && tokenSecret) {
      const wallet = mp.verifyJWT(token, tokenSecret) as MostWallet | null;
      if (wallet) {
        set({ wallet });
      }
    }
  },
  setItem: (key, value) => set((state) => ({ ...state, [key]: value })),
  firstPath: "",
  exit() {
    set({ wallet: undefined });
    localStorage.removeItem("token");
    localStorage.removeItem("tokenSecret");
  },
}));
