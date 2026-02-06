"use client";

import crust from "@/utils/crust";
import { mostCrust, type MostWallet } from "@/utils/MostWallet";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/utils/idbStorage";
import mp from "@/utils/mp";
import { notifications } from "@mantine/notifications";

interface BaseItem {
  name: string;
  type: "file" | "directory";
  size: number;
  cid: string;
  path: string;
  created_at: number;
}

export interface FileItem extends BaseItem {
  expired_at: number;
  tx_hash: string;
}

export interface NoteItem extends BaseItem {
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
  // 余额
  balance: string;
  initBalance: () => Promise<void>;
  // IPFS 网关
  dotCID: string;
  // 首页 Tab
  homeTab: string;
  // 本地文件操作
  addFile: (file: Omit<FileItem, "created_at">) => void;
  deleteFile: (cid?: string, path?: string, name?: string) => void;
  renameFile: (oldPath: string, newPath: string, newName: string) => void;
  // 笔记操作
  addNote: (
    file: Omit<NoteItem, "created_at" | "cid"> & { cid?: string },
  ) => Promise<string>;
  deleteNote: (cid?: string, path?: string, name?: string) => void;
  renameNote: (oldPath: string, newPath: string, newName: string) => void;
  // 导入导出
  exportData: () => UserData;
  importData: (data: UserData) => void;
  // 同步 (完全去中心化方案：Crust Remark)
  syncToChain: () => Promise<void>;
  syncFromChain: () => Promise<void>;
  // 退出登录
  exit: () => void;
  // Hydration 状态
  isHydrated: boolean;
  setHydrated: (state: boolean) => void;
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

      // 本地文件操作实现
      addFile(file) {
        if (file.type === "directory") return;
        const normalizedPath = mp.normalizePath(file.path);
        const newItem = {
          ...file,
          path: normalizedPath,
          created_at: Date.now(),
        } as FileItem;

        set((state) => {
          const items = state.files;
          const exists = items.some(
            (f) =>
              mp.normalizePath(f.path) === normalizedPath &&
              f.name === file.name,
          );
          if (exists) {
            return {
              files: items.map((f) =>
                mp.normalizePath(f.path) === normalizedPath &&
                f.name === file.name
                  ? newItem
                  : f,
              ),
            };
          }
          return { files: [...items, newItem] };
        });
      },

      deleteFile(cid, path, name) {
        const normalizedPath = path !== undefined ? mp.normalizePath(path) : "";
        set((state) => ({
          files: state.files.filter((item) => {
            if (cid && item.cid === cid) return false;
            if (
              path !== undefined &&
              name !== undefined &&
              mp.normalizePath(item.path) === normalizedPath &&
              item.name === name
            )
              return false;
            return true;
          }),
        }));
      },

      renameFile(oldPath, newPath, newName) {
        const oldPathNorm = mp.normalizePath(oldPath);
        const newPathNorm = mp.normalizePath(newPath);

        set((state) => ({
          files: state.files.map((item) => {
            const itemPath = mp.normalizePath(item.path);
            const fullPath =
              itemPath === "" ? item.name : `${itemPath}/${item.name}`;

            if (fullPath === oldPathNorm) {
              return { ...item, path: newPathNorm, name: newName };
            }

            if (fullPath.startsWith(oldPathNorm + "/")) {
              const relativePath = fullPath.slice(oldPathNorm.length);
              const newFullPath = mp.normalizePath(
                (newPathNorm ? `${newPathNorm}/${newName}` : newName) +
                  relativePath,
              );
              const lastSlashIndex = newFullPath.lastIndexOf("/");
              return {
                ...item,
                path:
                  lastSlashIndex === -1
                    ? ""
                    : newFullPath.slice(0, lastSlashIndex),
                name: newFullPath.slice(lastSlashIndex + 1),
              };
            }
            return item;
          }),
        }));
      },

      // 笔记操作实现
      async addNote(file) {
        if (file.type === "directory") return "";

        const content = file.content || "";
        const cid = file.cid || (await mp.calculateCID(content));

        const normalizedPath = mp.normalizePath(file.path);
        const newItem = {
          ...file,
          content,
          cid,
          path: normalizedPath,
          created_at: Date.now(),
        } as NoteItem;

        set((state) => {
          const items = state.notes;
          const exists = items.some(
            (f) =>
              mp.normalizePath(f.path) === normalizedPath &&
              f.name === file.name,
          );
          if (exists) {
            return {
              notes: items.map((f) =>
                mp.normalizePath(f.path) === normalizedPath &&
                f.name === file.name
                  ? newItem
                  : f,
              ),
            };
          }
          return { notes: [...items, newItem] };
        });

        return cid;
      },

      deleteNote(cid, path, name) {
        const normalizedPath = path !== undefined ? mp.normalizePath(path) : "";
        set((state) => ({
          notes: state.notes.filter((item) => {
            if (cid && item.cid === cid) return false;
            if (
              path !== undefined &&
              name !== undefined &&
              mp.normalizePath(item.path) === normalizedPath &&
              item.name === name
            )
              return false;
            return true;
          }),
        }));
      },

      renameNote(oldPath, newPath, newName) {
        const oldPathNorm = mp.normalizePath(oldPath);
        const newPathNorm = mp.normalizePath(newPath);

        set((state) => ({
          notes: state.notes.map((item) => {
            const itemPath = mp.normalizePath(item.path);
            const fullPath =
              itemPath === "" ? item.name : `${itemPath}/${item.name}`;

            if (fullPath === oldPathNorm) {
              return { ...item, path: newPathNorm, name: newName };
            }

            if (fullPath.startsWith(oldPathNorm + "/")) {
              const relativePath = fullPath.slice(oldPathNorm.length);
              const newFullPath = mp.normalizePath(
                (newPathNorm ? `${newPathNorm}/${newName}` : newName) +
                  relativePath,
              );
              const lastSlashIndex = newFullPath.lastIndexOf("/");
              return {
                ...item,
                path:
                  lastSlashIndex === -1
                    ? ""
                    : newFullPath.slice(0, lastSlashIndex),
                name: newFullPath.slice(lastSlashIndex + 1),
              };
            }
            return item;
          }),
        }));
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

      // 同步到链上 (Crust Remark)
      async syncToChain() {
        const { wallet, exportData } = get();
        if (!wallet) {
          notifications.show({ message: "请先登录", color: "red" });
          return;
        }

        try {
          const data = exportData();
          const backupContent = JSON.stringify(data);

          // 构造上传列表
          // 1. 备份文件
          const uploadFiles = [
            { path: "most-box-backup.json", content: backupContent },
          ];

          // 2. 上传到 IPFS (作为文件夹上传)
          const crustWallet = mostCrust(wallet.danger);
          const { cid } = await crust.upload(uploadFiles, crustWallet);

          // 3. 写入链上 Remark
          await crust.saveRemark(cid, wallet.danger, get().balance);

          notifications.show({
            message: "同步到链上成功",
            color: "green",
          });
        } catch (error) {
          throw error;
        }
      },

      // 从链上拉取 (Crust Remark)
      async syncFromChain() {
        const { wallet, dotCID } = get();
        if (!wallet) {
          notifications.show({ message: "请先登录", color: "red" });
          return;
        }

        try {
          const { crust_address } = mostCrust(wallet.danger);
          // 1. 从链上获取最新 CID
          const cid = await crust.getRemark(crust_address);
          if (!cid) {
            notifications.show({
              message: "未在链上找到备份记录",
              color: "red",
            });
            return;
          }

          // 2. 从网关拉取 JSON 数据 (直接作为文件夹获取)
          const res = await fetch(`${dotCID}/ipfs/${cid}/most-box-backup.json`);
          if (!res.ok) {
            throw new Error(
              `从网关获取备份失败: ${res.status} ${res.statusText}`,
            );
          }
          const data = await res.json();

          if (data && data.notes && data.files) {
            set({ notes: data.notes, files: data.files });
            notifications.show({
              message: "从链上恢复成功",
              color: "green",
            });
          }
        } catch (error) {
          notifications.show({
            message: "从链上恢复失败",
            color: "red",
          });
          console.error("从链上恢复失败", error);
        }
      },

      // 余额
      balance: "",
      async initBalance() {
        const { wallet } = get();
        if (wallet) {
          try {
            const { crust_address } = mostCrust(wallet.danger);
            const balance = await crust.balance(crust_address);
            set({ balance });
          } catch (error) {
            console.error("获取 Crust 余额失败", error);
          }
        }
      },
      // IPFS 网关
      dotCID: "https://gw.crust-gateway.com",
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
