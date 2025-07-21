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
  exit: () => void;
  firstPath: string;
  dotAPI: string;
  dotCID: string;
  dotNodes: DotNode[];
  notes?: Note[];
  files?: FileItem[];
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
    const dotAPI = new URL(url).origin;
    try {
      const res = await api.get(dotAPI + "/api.dot", {
        timeout: 3000,
      });
      const dot: Dot = res.data;
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

      return dot.APIs;
    } catch (error) {
      notifications.show({
        title: "节点切换失败",
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
  dotNodes: [],
  notes: undefined,
  files: undefined,
  exit() {
    set({
      wallet: undefined,
      notes: undefined,
      files: undefined,
    });
    localStorage.removeItem("jwt");
    localStorage.removeItem("jwtSecret");
    localStorage.removeItem("token");
  },
}));
