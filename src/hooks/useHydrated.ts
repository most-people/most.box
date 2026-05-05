"use client";

import { useUserStore } from "@/stores/userStore";

/**
 * 一个用于检查 Zustand Store 是否已完成持久化数据激活 (Hydration) 的钩子
 * 适用于全局，确保在读取本地存储数据前，数据已准备就绪
 */
export const useHydrated = () => {
  return useUserStore((state) => state.isHydrated);
};
