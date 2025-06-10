import mp from "@/constants/mp";
import dayjs from "dayjs";
import { type DotMethods, type DotClient, type MostWallet } from "dot.most.box";
import { isAddress } from "ethers";
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
  dotClient: DotClient | null;
  dot: DotMethods | null;
  exit: () => void;
  firstPath: string;
  onlinePeople: Record<string, People>;
  onlineUpdate: (data?: Record<string, People>) => void;
  notify: Record<string, Notify>;
  friendRead: (address: string) => void;
}

interface State extends UserStore {
  setItem: <K extends keyof State>(key: K, value: State[K]) => void;
}

export const useUserStore = create<State>((set, get) => ({
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
  dotClient: null,
  dot: null,
  setItem: (key, value) => set((state) => ({ ...state, [key]: value })),
  firstPath: "",
  onlinePeople: {},
  onlineUpdate(data?: Record<string, People>) {
    if (data) {
      const dict = { ...get().onlinePeople };
      for (const address in data) {
        const people = data[address];
        if (isAddress(address) && typeof people.value === "string") {
          const diff = dayjs().diff(dayjs(people.timestamp), "minute");
          // 如果超过5分钟，从列表中移除
          if (diff > 5) {
            delete dict[address];
            continue;
          }
          // 5分钟内的用户，更新或添加
          if (get().onlinePeople[address]) {
            // 已存在的用户，直接更新为最新数据
            dict[address] = people;
          } else {
            // 新用户，直接添加
            dict[address] = people;
          }
        }
      }
      set({ onlinePeople: dict });
    }
  },
  notify: {},
  friendRead(address: string) {
    const dot = get().dot;
    const newNotify = { ...get().notify };
    if (newNotify[address] && dot) {
      delete newNotify[address];
      dot.put("notify", newNotify);
    }
  },
  exit() {
    set({ wallet: undefined, dot: null, notify: {} });
    localStorage.removeItem("token");
    localStorage.removeItem("tokenSecret");
  },
}));
