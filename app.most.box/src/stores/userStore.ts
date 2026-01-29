import { getCrustBalance } from "@/utils/crust";
import { mostCrust, type MostWallet } from "@/utils/MostWallet";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/utils/idbStorage";
import mp from "@/utils/mp";

export interface FileItem {
  name: string;
  type: "file" | "directory";
  size: number;
  cid: {
    "/": string;
  };
  path: string; // 文件所在的目录路径，例如 "" 或 "notes"
  createdAt: number;
  txHash?: string;
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
  files: FileItem[]; // 改为非可选，初始化为空数组
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
  addLocalFile: (file: Omit<FileItem, "createdAt">) => void;
  deleteLocalFile: (cid: string) => void;
  renameLocalFile: (oldPath: string, newPath: string, newName: string) => void;
  // 退出登录
  exit: () => void;
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
      notes: undefined,
      notesQuery: "",
      nodeDark: "",

      // 文件系统
      files: [],
      filesPath: "",
      // 设备指纹
      fingerprint: "",

      // 本地文件操作实现
      addLocalFile(file) {
        if (file.type === "directory") return; // 不再存储显式的目录条目

        set((state) => {
          // 统一路径格式
          const normalizedPath = mp.normalizePath(file.path);
          const newFile = {
            ...file,
            path: normalizedPath,
          };

          // 检查是否已存在 (基于路径和名称)
          const exists = state.files.some(
            (file) => file.path === normalizedPath && file.name === file.name,
          );
          if (exists) {
            return {
              files: state.files.map((file) =>
                file.path === normalizedPath && file.name === file.name
                  ? { ...newFile, createdAt: Date.now() }
                  : file,
              ),
            };
          }
          return {
            files: [...state.files, { ...newFile, createdAt: Date.now() }],
          };
        });
      },

      deleteLocalFile(cid) {
        set((state) => ({
          files: state.files.filter((file) => file.cid["/"] !== cid),
        }));
      },

      renameLocalFile(oldPath, newPath, newName) {
        set((state) => {
          const oldPathNorm = mp.normalizePath(oldPath);

          return {
            files: state.files.map((file) => {
              const fullPath = mp.normalizePath(
                file.path === "" ? file.name : `${file.path}/${file.name}`,
              );

              // 如果是目标文件/文件夹本身
              if (fullPath === oldPathNorm) {
                const targetPath = mp.normalizePath(newPath);
                return {
                  ...file,
                  path: targetPath,
                  name: newName,
                };
              }

              // 如果是在该文件夹下的子文件 (处理移动文件夹的情况)
              if (fullPath.startsWith(oldPathNorm + "/")) {
                const relativePath = fullPath.slice(oldPathNorm.length);
                const newFullPath = mp.normalizePath(
                  (newPath ? `${newPath}/${newName}` : newName) + relativePath,
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
          };
        });
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
          notes: undefined,
          files: [],
          jwt: "",
          firstPath: "",
          notesQuery: "",
          filesPath: "",
          balance: "",
          dotCID: "",
          homeTab: "file",
        });
      },
    }),
    {
      name: "most-box-storage",
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
