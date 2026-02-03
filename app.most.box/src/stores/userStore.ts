import {
  getCrustBalance,
  saveCIDToRemark,
  getLatestCIDFromRemark,
  uploadToCrust,
} from "@/utils/crust";
import { mostCrust, mostMnemonic, type MostWallet } from "@/utils/MostWallet";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/utils/idbStorage";
import mp from "@/utils/mp";
import { api } from "@/utils/api";

export interface FileItem {
  name: string;
  type: "file" | "directory";
  size: number;
  cid?: string;
  path: string;
  createdAt: number;
  txHash?: string;
}

export interface NoteItem extends FileItem {
  content: string;
}

export interface UserData {
  notes: NoteItem[];
  files: FileItem[];
}

interface UserStore {
  wallet?: MostWallet;
  setWallet: (wallet: MostWallet) => void;
  firstPath: string;
  // 笔记
  notes: NoteItem[];
  notesQuery: string;
  notesPath: string;
  notesDark: "toastui-editor-dark" | "";
  // 文件
  files: FileItem[];
  filesPath: string;
  fingerprint: string;
  // 余额
  balance: string;
  initBalance: () => Promise<void>;
  // IPFS 网关
  dotCID: string;
  // JWT
  jwt: string;
  // 首页 Tab
  homeTab: string;
  // 本地文件操作
  addFile: (file: Omit<FileItem, "createdAt">) => void;
  deleteFile: (cid?: string, path?: string, name?: string) => void;
  renameFile: (oldPath: string, newPath: string, newName: string) => void;
  // 笔记操作
  addNote: (
    file: Omit<NoteItem, "createdAt" | "cid"> & { cid?: string },
  ) => Promise<string>;
  deleteNote: (cid?: string, path?: string, name?: string) => void;
  renameNote: (oldPath: string, newPath: string, newName: string) => void;
  // 导入导出
  exportData: () => UserData;
  importData: (data: UserData) => void;
  // 同步
  syncToCloud: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  syncToChain: () => Promise<void>;
  syncFromChain: () => Promise<void>;
  // 退出登录
  exit: () => void;
  // Hydration 状态
  isHydrated: boolean;
  setHydrated: (state: boolean) => void;
  // 内部辅助
  _updateItems: <K extends "files" | "notes">(
    key: K,
    updater: (
      items: K extends "files" ? FileItem[] : NoteItem[],
    ) => K extends "files" ? FileItem[] : NoteItem[],
  ) => void;
}

interface State extends UserStore {
  setItem: <K extends keyof State>(key: K, value: State[K]) => void;
}

export const useUserStore = create<State>()(
  persist(
    (set, get) => ({
      // 钱包
      wallet: undefined,
      setWallet(wallet: MostWallet) {
        set({ wallet });
        get().initBalance();
      },
      // 返回
      firstPath: "",
      // 笔记
      notes: [],
      notesQuery: "",
      notesPath: "",
      notesDark: "",
      // 文件系统
      files: [],
      filesPath: "",
      // 设备指纹
      fingerprint: "",

      // 通用列表更新辅助函数
      _updateItems(key: string, updater: (items: any[]) => any[]) {
        set((state: any) => ({
          [key]: updater(state[key]),
        }));
      },

      // 本地文件操作实现
      addFile(file) {
        if (file.type === "directory") return;

        const normalizedPath = mp.normalizePath(file.path);
        const newFile: FileItem = {
          ...file,
          path: normalizedPath,
          createdAt: Date.now(),
        };

        get()._updateItems("files", (files: FileItem[]) => {
          const exists = files.some(
            (f: FileItem) => f.path === normalizedPath && f.name === file.name,
          );
          if (exists) {
            return files.map((f: FileItem) =>
              f.path === normalizedPath && f.name === file.name ? newFile : f,
            );
          }
          return [...files, newFile];
        });
      },

      deleteFile(cid, path, name) {
        const normalizedPath = path !== undefined ? mp.normalizePath(path) : "";
        get()._updateItems("files", (files: FileItem[]) =>
          files.filter((file: FileItem) => {
            if (cid && file.cid === cid) return false;
            if (
              path !== undefined &&
              name !== undefined &&
              file.path === normalizedPath &&
              file.name === name
            )
              return false;
            return true;
          }),
        );
      },

      renameFile(oldPath, newPath, newName) {
        const oldPathNorm = mp.normalizePath(oldPath);
        const newPathNorm = mp.normalizePath(newPath);

        get()._updateItems("files", (files: FileItem[]) =>
          files.map((file: FileItem) => {
            const fullPath = mp.normalizePath(
              file.path === "" ? file.name : `${file.path}/${file.name}`,
            );

            if (fullPath === oldPathNorm) {
              return { ...file, path: newPathNorm, name: newName };
            }

            if (fullPath.startsWith(oldPathNorm + "/")) {
              const relativePath = fullPath.slice(oldPathNorm.length);
              const newFullPath = mp.normalizePath(
                (newPathNorm ? `${newPathNorm}/${newName}` : newName) +
                  relativePath,
              );
              const lastSlashIndex = newFullPath.lastIndexOf("/");
              return {
                ...file,
                path:
                  lastSlashIndex === -1
                    ? ""
                    : newFullPath.slice(0, lastSlashIndex),
                name: newFullPath.slice(lastSlashIndex + 1),
              };
            }
            return file;
          }),
        );
      },

      // 笔记操作实现
      async addNote(file) {
        if (file.type === "directory") return "";

        const normalizedPath = mp.normalizePath(file.path);
        const content = file.content || "";
        const cid = file.cid || (await mp.calculateCID(content));

        const newNote: NoteItem = {
          ...file,
          cid,
          content,
          path: normalizedPath,
          createdAt: Date.now(),
        };

        get()._updateItems("notes", (notes: NoteItem[]) => {
          const exists = notes.some(
            (f: NoteItem) => f.path === normalizedPath && f.name === file.name,
          );
          if (exists) {
            return notes.map((f: NoteItem) =>
              f.path === normalizedPath && f.name === file.name ? newNote : f,
            );
          }
          return [...notes, newNote];
        });

        return cid;
      },

      deleteNote(cid, path, name) {
        const normalizedPath = path !== undefined ? mp.normalizePath(path) : "";
        get()._updateItems("notes", (notes: NoteItem[]) =>
          notes.filter((file: NoteItem) => {
            if (cid && file.cid === cid) return false;
            if (
              path !== undefined &&
              name !== undefined &&
              file.path === normalizedPath &&
              file.name === name
            )
              return false;
            return true;
          }),
        );
      },

      renameNote(oldPath, newPath, newName) {
        const oldPathNorm = mp.normalizePath(oldPath);
        const newPathNorm = mp.normalizePath(newPath);

        get()._updateItems("notes", (notes: NoteItem[]) =>
          notes.map((file: NoteItem) => {
            const fullPath = mp.normalizePath(
              file.path === "" ? file.name : `${file.path}/${file.name}`,
            );

            if (fullPath === oldPathNorm) {
              return { ...file, path: newPathNorm, name: newName };
            }

            if (fullPath.startsWith(oldPathNorm + "/")) {
              const relativePath = fullPath.slice(oldPathNorm.length);
              const newFullPath = mp.normalizePath(
                (newPathNorm ? `${newPathNorm}/${newName}` : newName) +
                  relativePath,
              );
              const lastSlashIndex = newFullPath.lastIndexOf("/");
              return {
                ...file,
                path:
                  lastSlashIndex === -1
                    ? ""
                    : newFullPath.slice(0, lastSlashIndex),
                name: newFullPath.slice(lastSlashIndex + 1),
              };
            }
            return file;
          }),
        );
      },

      // 导出用户数据
      exportData() {
        const { notes, files } = get();
        return { notes, files };
      },

      // 导入用户数据
      importData({ notes, files }) {
        if (notes && files) {
          set({ notes, files });
        }
      },

      // 同步到云端 (D1)
      async syncToCloud() {
        const { notes, files } = get();
        try {
          await api.post("/user.data.sync", { notes, files });
          console.info("同步到云端成功");
        } catch (error) {
          console.error("同步到云端失败", error);
          throw error;
        }
      },

      // 从云端拉取 (D1)
      async syncFromCloud() {
        try {
          const { data } = await api.post("/user.data.get");
          if (data && data.notes && data.files) {
            set({ notes: data.notes, files: data.files });
            console.info("从云端拉取成功");
          }
        } catch (error) {
          console.error("从云端拉取失败", error);
          throw error;
        }
      },

      // 同步到链上 (Crust Remark)
      async syncToChain() {
        const { wallet, exportData } = get();
        if (!wallet) return;

        try {
          const data = exportData();
          const blob = new Blob([JSON.stringify(data)], {
            type: "application/json",
          });
          const file = new File([blob], "most-box-backup.json", {
            type: "application/json",
          });

          const mnemonic = mostMnemonic(wallet.danger);
          // 1. 上传到 IPFS
          const { cid } = await uploadToCrust(file, mnemonic);

          // 2. 写入链上 Remark
          await saveCIDToRemark(cid, wallet.danger);

          console.info("同步到链上成功");
        } catch (error) {
          console.error("同步到链上失败", error);
          throw error;
        }
      },

      // 从链上拉取 (Crust Remark)
      async syncFromChain() {
        const { wallet } = get();
        if (!wallet) return;

        try {
          const { crust_address } = await mostCrust(wallet.danger);
          // 1. 从链上获取最新 CID
          const cid = await getLatestCIDFromRemark(crust_address);
          if (!cid) {
            console.warn("未在链上找到备份记录");
            return;
          }

          // 2. 从网关拉取 JSON 数据
          const res = await fetch(`https://gw.crustfiles.app/ipfs/${cid}`);
          const data = await res.json();

          if (data && data.notes && data.files) {
            set({ notes: data.notes, files: data.files });
            console.info("从链上恢复成功");
          }
        } catch (error) {
          console.error("从链上恢复失败", error);
          throw error;
        }
      },

      // 余额
      balance: "",
      async initBalance() {
        const { wallet } = get();
        if (wallet) {
          try {
            const { crust_address } = await mostCrust(wallet.danger);
            const balance = await getCrustBalance(crust_address);
            set({ balance });
          } catch (error) {
            console.error("获取 Crust 余额失败", error);
          }
        }
      },
      // IPFS 网关
      dotCID: "",
      // JWT
      jwt: "",
      // 首页 Tab
      homeTab: "file",
      // 通用设置器
      setItem: (key, value) => set((state) => ({ ...state, [key]: value })),
      // 退出登录
      exit() {
        set({
          wallet: undefined,
          files: [],
          notes: [],
          jwt: "",
          firstPath: "",
          notesQuery: "",
          filesPath: "",
          notesPath: "",
          balance: "",
          dotCID: "",
          homeTab: "file",
        });
      },
      // Hydration
      isHydrated: false,
      setHydrated(state) {
        set({ isHydrated: state });
      },
    }),
    {
      name: "most-box-storage",
      storage: createJSONStorage(() => idbStorage),
      // 不持久化 isHydrated
      partialize: (state) => {
        const { isHydrated, ...rest } = state;
        return rest;
      },
      onRehydrateStorage: (state) => {
        return (hydratedState, error) => {
          if (!error && hydratedState) {
            hydratedState.setHydrated(true);
          }
        };
      },
    },
  ),
);
