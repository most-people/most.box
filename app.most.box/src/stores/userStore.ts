import mp from "@/constants/mp";
import { type MostWallet } from "@/constants/MostWallet";
import { create } from "zustand";
import { api, DotAPI, DotCID } from "@/constants/api";
import { notifications } from "@mantine/notifications";

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

export interface Note {
  name: string;
  cid: string;
}

interface UserStore {
  wallet?: MostWallet;
  initWallet: () => void;
  updateDot: (url: string, first?: boolean) => Promise<string[] | null>;
  exit: () => void;
  firstPath: string;
  dotAPI: string;
  dotCID: string;
  notes: Note[];
}

interface State extends UserStore {
  setItem: <K extends keyof State>(key: K, value: State[K]) => void;
}

export const useUserStore = create<State>((set) => ({
  wallet: undefined,
  initWallet() {
    const jwt = localStorage.getItem("jwt");
    const jwtSecret = localStorage.getItem("jwtSecret");
    if (jwt && jwtSecret) {
      const wallet = mp.verifyJWT(jwt, jwtSecret);
      if (wallet) {
        mp.createToken(wallet);
        set({ wallet });
      }
    }
  },
  async updateDot(url, first) {
    const dotAPI = new URL(url).origin;
    try {
      const res = await api(dotAPI + "/ipv6");
      const ipv6Set: Set<string> = new Set(res.data);
      ipv6Set.add(dotAPI);
      api.defaults.baseURL = dotAPI;
      set({ dotAPI });
      localStorage.dotAPI = dotAPI;

      if (!first) {
        notifications.show({
          title: "节点已切换",
          message: dotAPI,
          color: "green",
        });
      }
      if (dotAPI.endsWith("1976")) {
        const dotCID = dotAPI.slice(0, -4) + "8080";
        set({ dotCID });
        localStorage.dotCID = dotCID;
      }
      return Array.from(ipv6Set);
    } catch (error) {
      notifications.show({
        title: "节点未切换",
        message: dotAPI,
        color: "red",
      });
      console.error(error);
      set({ dotAPI: api.defaults.baseURL || "" });
    }
    return null;
  },
  setItem: (key, value) => set((state) => ({ ...state, [key]: value })),
  firstPath: "",
  dotAPI: DotAPI,
  dotCID: DotCID,
  exit() {
    set({ wallet: undefined });
    localStorage.removeItem("jwt");
    localStorage.removeItem("jwtSecret");
  },
  notes: [],
}));
