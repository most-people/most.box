"use client";

import crust from "@/utils/crust";
import { mostCrust, mostMnemonic, type MostWallet } from "@/utils/MostWallet";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/utils/idbStorage";
import mp from "@/utils/mp";
import { notifications } from "@mantine/notifications";

export interface FileItem {
  name: string;
  type: "file" | "directory";
  size: number;
  cid: string;
  path: string;
  createdAt: number;
  txHash?: string;
  content?: string;
}

export interface UserData {
  notes: FileItem[];
  files: FileItem[];
}

interface UserStore {
  wallet?: MostWallet;
  setWallet: (wallet: MostWallet) => void;
  firstPath: string;
  // 笔记
  notes: FileItem[];
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
  addFile: (file: Omit<FileItem, "createdAt">) => void;
  deleteFile: (cid?: string, path?: string, name?: string) => void;
  renameFile: (oldPath: string, newPath: string, newName: string) => void;
  // 笔记操作
  addNote: (
    file: Omit<FileItem, "createdAt" | "cid"> & { cid?: string },
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
  // 内部辅助
  _updateItems: <K extends "files" | "notes">(
    key: K,
    updater: (items: FileItem[]) => FileItem[],
  ) => void;
  _addItem: (key: "files" | "notes", item: FileItem) => void;
  _deleteItem: (
    key: "files" | "notes",
    cid?: string,
    path?: string,
    name?: string,
  ) => void;
  _renameItem: (
    key: "files" | "notes",
    oldPath: string,
    newPath: string,
    newName: string,
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

      // 通用列表更新辅助函数
      _updateItems(
        key: "files" | "notes",
        updater: (items: FileItem[]) => FileItem[],
      ) {
        set((state: State) => ({
          [key]: updater(state[key]),
        }));
      },

      // --- 通用项操作逻辑 ---
      _addItem(key: "files" | "notes", item: FileItem) {
        const normalizedPath = mp.normalizePath(item.path);
        const newItem = {
          ...item,
          path: normalizedPath,
          createdAt: Date.now(),
        };

        get()._updateItems(key, (items: FileItem[]) => {
          const exists = items.some(
            (f) =>
              mp.normalizePath(f.path) === normalizedPath &&
              f.name === item.name,
          );
          if (exists) {
            return items.map((f) =>
              mp.normalizePath(f.path) === normalizedPath &&
              f.name === item.name
                ? newItem
                : f,
            );
          }
          return [...items, newItem];
        });
      },

      _deleteItem(
        key: "files" | "notes",
        cid?: string,
        path?: string,
        name?: string,
      ) {
        const normalizedPath = path !== undefined ? mp.normalizePath(path) : "";
        get()._updateItems(key, (items: FileItem[]) =>
          items.filter((item) => {
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
        );
      },

      _renameItem(
        key: "files" | "notes",
        oldPath: string,
        newPath: string,
        newName: string,
      ) {
        const oldPathNorm = mp.normalizePath(oldPath);
        const newPathNorm = mp.normalizePath(newPath);

        get()._updateItems(key, (items: FileItem[]) =>
          items.map((item) => {
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
        );
      },

      // 本地文件操作实现
      addFile(file) {
        if (file.type === "directory") return;
        get()._addItem("files", file as FileItem);
      },

      deleteFile(cid, path, name) {
        get()._deleteItem("files", cid, path, name);
      },

      renameFile(oldPath, newPath, newName) {
        get()._renameItem("files", oldPath, newPath, newName);
      },

      // 笔记操作实现
      async addNote(file) {
        if (file.type === "directory") return "";

        const content = file.content || "";
        const cid = file.cid || (await mp.calculateCID(content));

        get()._addItem("notes", { ...file, content, cid } as FileItem);
        return cid;
      },

      deleteNote(cid, path, name) {
        get()._deleteItem("notes", cid, path, name);
      },

      renameNote(oldPath, newPath, newName) {
        get()._renameItem("notes", oldPath, newPath, newName);
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
