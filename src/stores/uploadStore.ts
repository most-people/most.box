import { create } from "zustand";
import { useUserStore } from "./userStore";
import { mostCrust } from "@/utils/MostWallet";
import crust from "@/utils/crust";

export interface UploadTask {
  id: string;
  name: string;
  size: number;
  type: "file" | "directory";
  status:
    | "pending"
    | "uploading"
    | "success"
    | "error"
    | "cancelled"
    | "waiting";
  progress: number;
  uploadedBytes: number;
  speed: number;
  startTime?: number;
  error?: string;
  file?: File | { path: string; content: Blob | string | Buffer }[];
  abortController?: AbortController;
  cid?: string;
  path: string; // Target directory path
}

interface UploadState {
  tasks: UploadTask[];
  isUploading: boolean;
  concurrency: number;
  isOpen: boolean;

  addFiles: (files: File[], path: string, autoStart?: boolean) => void;
  addDirectory: (
    files: { path: string; content: Blob | string | Buffer }[],
    name: string,
    size: number,
    path: string,
    autoStart?: boolean,
  ) => void;
  cancelTask: (id: string) => void;
  removeTask: (id: string) => void;
  startUpload: () => void;
  cancelAll: () => void;
  retryTask: (
    id: string,
    file?: File | { path: string; content: Blob | string | Buffer }[],
  ) => void;
  clearCompleted: () => void;
  setIsOpen: (isOpen: boolean) => void;

  // Internal
  _processQueue: () => Promise<void>;
}

export const useUploadStore = create<UploadState>((set, get) => ({
  tasks: [],
  isUploading: false,
  concurrency: 3,
  isOpen: false,

  addFiles: (files, path, autoStart = true) => {
    const newTasks: UploadTask[] = files.map((file) => {
      let taskPath = path;
      // @ts-ignore
      if (file.webkitRelativePath) {
        // @ts-ignore
        const parts = file.webkitRelativePath.split("/");
        if (parts.length > 1) {
          const relativeDir = parts.slice(0, -1).join("/");
          // 确保路径分隔符正确，防止双斜杠
          const base = path ? path.replace(/\/$/, "") : "";
          taskPath = base ? `${base}/${relativeDir}` : relativeDir;
        }
      } else {
        taskPath = path;
      }

      return {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        type: "file",
        status: autoStart ? "pending" : "waiting",
        progress: 0,
        uploadedBytes: 0,
        speed: 0,
        file: file,
        path: taskPath,
      };
    });

    set((state) => ({
      tasks: [...state.tasks, ...newTasks],
      isOpen: true,
    }));

    if (autoStart) {
      get()._processQueue();
    }
  },

  addDirectory: (files, name, size, path, autoStart = true) => {
    const newTask: UploadTask = {
      id: Math.random().toString(36).substring(7),
      name: name,
      size: size,
      type: "directory",
      status: autoStart ? "pending" : "waiting",
      progress: 0,
      uploadedBytes: 0,
      speed: 0,
      file: files,
      path: path,
    };

    set((state) => ({
      tasks: [...state.tasks, newTask],
      isOpen: true,
    }));

    if (autoStart) {
      get()._processQueue();
    }
  },

  removeTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
  },

  startUpload: () => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.status === "waiting" ? { ...t, status: "pending" } : t,
      ),
    }));
    get()._processQueue();
  },

  cancelTask: (id) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === id);
    if (task && task.abortController) {
      task.abortController.abort();
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: "cancelled", speed: 0 } : t,
      ),
    }));

    // Trigger queue processing to start next task if slot freed
    get()._processQueue();
  },

  cancelAll: () => {
    const state = get();
    state.tasks.forEach((task) => {
      if (task.status === "uploading" || task.status === "pending") {
        if (task.abortController) {
          task.abortController.abort();
        }
      }
    });

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.status === "uploading" || t.status === "pending"
          ? { ...t, status: "cancelled", speed: 0 }
          : t,
      ),
      isUploading: false,
    }));
  },

  retryTask: (id, file) => {
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            status: "pending",
            progress: 0,
            uploadedBytes: 0,
            speed: 0,
            error: undefined,
            file: file || t.file, // Update file if provided (e.g. re-selected)
          };
        }
        return t;
      }),
    }));
    get()._processQueue();
  },

  clearCompleted: () => {
    set((state) => ({
      tasks: state.tasks.filter(
        (t) => t.status === "uploading" || t.status === "pending",
      ),
    }));
  },

  setIsOpen: (isOpen) => set({ isOpen }),

  _processQueue: async () => {
    const state = get();
    const { tasks, concurrency } = state;
    const uploadingCount = tasks.filter((t) => t.status === "uploading").length;

    if (uploadingCount >= concurrency) return;

    const nextTask = tasks.find((t) => t.status === "pending");
    if (!nextTask) {
      if (uploadingCount === 0) {
        set({ isUploading: false });
      }
      return;
    }

    // Check wallet
    const wallet = useUserStore.getState().wallet;
    if (!wallet) {
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === nextTask.id
            ? { ...t, status: "error", error: "Wallet not connected" }
            : t,
        ),
      }));
      return;
    }

    const abortController = new AbortController();

    set((s) => ({
      isUploading: true,
      tasks: s.tasks.map((t) =>
        t.id === nextTask.id
          ? {
              ...t,
              status: "uploading",
              startTime: Date.now(),
              abortController,
            }
          : t,
      ),
    }));

    // Trigger next immediately if concurrency allows
    get()._processQueue();

    try {
      const crustWallet = mostCrust(wallet.danger);

      if (!nextTask.file) {
        throw new Error("File object missing (page reloaded?)");
      }

      let lastTime = Date.now();
      let lastBytes = 0;

      const onProgress = (bytes: number) => {
        const now = Date.now();
        const timeDiff = now - lastTime;

        // Update speed every 500ms
        if (timeDiff > 500) {
          const byteDiff = bytes - lastBytes;
          const speed = (byteDiff / timeDiff) * 1000; // bytes/s

          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === nextTask.id
                ? {
                    ...t,
                    progress: (bytes / t.size) * 100,
                    uploadedBytes: bytes,
                    speed,
                  }
                : t,
            ),
          }));

          lastTime = now;
          lastBytes = bytes;
        } else {
          // Update progress without speed
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === nextTask.id
                ? {
                    ...t,
                    progress: (bytes / t.size) * 100,
                    uploadedBytes: bytes,
                  }
                : t,
            ),
          }));
        }
      };

      const result = await crust.upload(
        nextTask.file,
        crustWallet,
        onProgress,
        abortController.signal,
        nextTask.name,
      );

      // Success
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === nextTask.id
            ? {
                ...t,
                status: "success",
                progress: 100,
                speed: 0,
                cid: result.cid,
              }
            : t,
        ),
      }));

      // Calculate correct path for userStore
      let directoryPath = nextTask.path;
      // If it's a file, path is the containing directory.
      // If it's a directory (website), path is the containing directory.
      // The `path` passed to addFiles/addDirectory should be the `currentPath` from explorer.

      // Note: In file.tsx, for single file:
      // const targetPath = mp.formatFilePath(file, currentPath);
      // const directoryPath = targetPath.split("/").slice(0, -1).join("/") || "/";
      // If currentPath is "", file "a.txt" -> "a.txt" -> dir "" -> "/"?
      // Wait, mp.formatFilePath logic:
      // if currentPath is "", parts=[dir, name]. dir from webkitRelativePath.
      // If just selecting files, webkitRelativePath is usually empty.
      // So parts=[name]. join("/") -> "name".
      // targetPath.split... -> empty.

      // We can simplify:
      // If nextTask.path is provided (e.g. "folder1"), the file "a.txt" goes into "folder1".
      // So the file's path property in userStore should be "folder1".
      // If nextTask.path is "", file's path is "". (or "/" depending on convention).
      // userStore seems to use normalized paths.

      const storePath = nextTask.path || "";

      // Add to user store (file list)
      useUserStore.getState().addFile({
        cid: result.cid,
        name: nextTask.name,
        size: nextTask.size,
        type: nextTask.type === "directory" ? "directory" : "file",
        path: storePath,
        expired_at: Date.now() + 180 * 24 * 60 * 60 * 1000, // Default 180 days
        tx_hash: "", // We don't get tx_hash from pin immediately unless we modify pin return
      });
    } catch (error: any) {
      if (error.name === "AbortError" || error.message === "Aborted") {
        // Already handled by cancelTask usually, but ensure state
        return;
      }

      console.error("Upload failed", error);
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === nextTask.id
            ? {
                ...t,
                status: "error",
                error: error.message || "Upload failed",
                speed: 0,
              }
            : t,
        ),
      }));
    } finally {
      get()._processQueue();
    }
  },
}));
