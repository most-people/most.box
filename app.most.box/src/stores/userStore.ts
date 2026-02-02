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
  cid?: string;
  path: string;
  createdAt: number;
  txHash?: string;
}

interface UserStore {
  wallet?: MostWallet;
  setWallet: (wallet: MostWallet) => void;
  firstPath: string;
  nodeDark: "toastui-editor-dark" | "";
  // 笔记
  notes: FileItem[];
  notesQuery: string;
  notesPath: string;
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
  addNote: (file: Omit<FileItem, "createdAt">) => void;
  deleteNote: (cid?: string, path?: string, name?: string) => void;
  renameNote: (oldPath: string, newPath: string, newName: string) => void;
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
      notesQuery: "",
      notesPath: "",
      nodeDark: "",

      // 文件系统
      files: [],
      notes: [],
      filesPath: "",
      // 设备指纹
      fingerprint: "",

      // 本地文件操作实现
      addFile(file) {
        if (file.type === "directory") return;

        set((state) => {
          const normalizedPath = mp.normalizePath(file.path);
          const newFile = {
            ...file,
            path: normalizedPath,
            createdAt: Date.now(),
          };

          const exists = state.files.some(
            (f) => f.path === normalizedPath && f.name === file.name,
          );

          if (exists) {
            return {
              files: state.files.map((f) =>
                f.path === normalizedPath && f.name === file.name ? newFile : f,
              ),
            };
          }

          return {
            files: [...state.files, newFile],
          };
        });
      },

      deleteFile(cid, path, name) {
        set((state) => {
          const normalizedPath =
            path !== undefined ? mp.normalizePath(path) : "";

          return {
            files: state.files.filter((file) => {
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
          };
        });
      },

      renameFile(oldPath, newPath, newName) {
        set((state) => {
          const oldPathNorm = mp.normalizePath(oldPath);
          const newPathNorm = mp.normalizePath(newPath);

          return {
            files: state.files.map((file) => {
              const fullPath = mp.normalizePath(
                file.path === "" ? file.name : `${file.path}/${file.name}`,
              );

              // 如果是目标文件/文件夹本身
              if (fullPath === oldPathNorm) {
                return {
                  ...file,
                  path: newPathNorm,
                  name: newName,
                };
              }

              // 如果是在该文件夹下的子文件 (处理移动文件夹的情况)
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
          };
        });
      },

      // 笔记操作实现
      addNote(file) {
        if (file.type === "directory") return;

        set((state) => {
          const normalizedPath = mp.normalizePath(file.path);
          const newFile = {
            ...file,
            path: normalizedPath,
            createdAt: Date.now(),
          };

          const exists = state.notes.some(
            (f) => f.path === normalizedPath && f.name === file.name,
          );

          if (exists) {
            return {
              notes: state.notes.map((f) =>
                f.path === normalizedPath && f.name === file.name ? newFile : f,
              ),
            };
          }

          return {
            notes: [...state.notes, newFile],
          };
        });
      },

      deleteNote(cid, path, name) {
        set((state) => {
          const normalizedPath =
            path !== undefined ? mp.normalizePath(path) : "";

          return {
            notes: state.notes.filter((file) => {
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
          };
        });
      },

      renameNote(oldPath, newPath, newName) {
        set((state) => {
          const oldPathNorm = mp.normalizePath(oldPath);
          const newPathNorm = mp.normalizePath(newPath);

          return {
            notes: state.notes.map((file) => {
              const fullPath = mp.normalizePath(
                file.path === "" ? file.name : `${file.path}/${file.name}`,
              );

              // 如果是目标文件/文件夹本身
              if (fullPath === oldPathNorm) {
                return {
                  ...file,
                  path: newPathNorm,
                  name: newName,
                };
              }

              // 如果是在该文件夹下的子文件 (处理移动文件夹的情况)
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
    }),
    {
      name: "most-box-storage",
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);
