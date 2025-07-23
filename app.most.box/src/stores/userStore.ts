import mp from "@/constants/mp";
import { type MostWallet } from "@/constants/MostWallet";
import { create } from "zustand";
import { api, DotAPI, DotCID } from "@/constants/api";
import { notifications } from "@mantine/notifications";

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
  initWallet: () => void;
  updateDot: (url: string, first?: boolean) => Promise<string[] | null>;
  firstPath: string;
  dotAPI: string;
  dotCID: string;
  dotNodes: DotNode[];
  notes?: Note[];
  files?: FileItem[];
  exit: () => void;
}

interface State extends UserStore {
  setItem: <K extends keyof State>(key: K, value: State[K]) => void;
}

export const useUserStore = create<State>((set, get) => ({
  wallet: undefined,
  initWallet() {
    const jwt = localStorage.getItem("jwt");
    const jwtSecret = localStorage.getItem("jwtSecret");
    if (jwt && jwtSecret) {
      const wallet = mp.verifyJWT(jwt, jwtSecret);
      if (wallet) {
        mp.createToken(wallet);
        set({ wallet });
      } else {
        get().exit();
      }
    }
  },
  async updateDot(url) {
    try {
      const dotAPI = new URL(url).origin;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(dotAPI + "/api.dot", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const dot: Dot = await res.json();
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
      notifications.show({
        title: "节点切换失败",
        message: url,
        color: "red",
      });
      console.info(error);
      set({ dotAPI: api.defaults.baseURL || "" });
    }
    return null;
  },
  setItem: (key, value) => set((state) => ({ ...state, [key]: value })),
  firstPath: "",
  dotAPI: DotAPI,
  dotCID: DotCID,
  dotNodes: [],
  notes: undefined,
  files: undefined,
  exit() {
    set({ wallet: undefined, notes: undefined, files: undefined });
    localStorage.removeItem("jwt");
    localStorage.removeItem("jwtSecret");
    localStorage.removeItem("token");
  },
}));
