import { create } from "zustand";
import { startTransition } from "react";
import { type DotMethods } from "dot.most.box";
import { useUserStore } from "@/stores/userStore";
import { Friend } from "@/hooks/useFriend";

interface FriendStore {
  inited: boolean;
  friends: Friend[];
  addFriend: (name: string, address: string, public_key: string) => void;
  delFriend: (address: string) => void;
  init: (dot: DotMethods) => void;
  reset: () => void;
}

interface State extends FriendStore {
  setItem: <K extends keyof State>(key: K, value: State[K]) => void;
  pushItem: <K extends keyof State>(
    key: K,
    value: State[K] extends unknown[]
      ? State[K] extends (infer T)[]
        ? T
        : never
      : never
  ) => void;
}

export const useFriendStore = create<State>((set, get) => ({
  inited: false,
  friends: [],
  setItem: (key, value) => set((state) => ({ ...state, [key]: value })),
  pushItem: (key, value) =>
    set((state) => {
      const prev = state[key];
      if (!Array.isArray(prev)) {
        console.log(`${key} 不是数组`);
        return state;
      }
      return {
        ...state,
        [key]: [value, ...prev],
      };
    }),
  addFriend(username: string, address: string, public_key: string) {
    // 检查登录
    const dot = useUserStore.getState().dot;
    if (dot) {
      // 检查是否已经存在，避免重复添加
      const friends = get().friends;
      if (!friends.some((e) => e.address === address)) {
        const timestamp = Date.now();
        const data: Friend = { username, address, public_key, timestamp };
        dot.put("friends", [data, ...friends], true);
      }
    }
  },
  delFriend(address: string) {
    // 检查登录
    const dot = useUserStore.getState().dot;
    if (dot) {
      // 检查是否已经删除，避免重复删除
      const topics = get().friends;
      const filter = topics.filter((e) => e.address !== address);
      if (filter.length < topics.length) {
        dot.put("friends", filter, true);
      }
    }
  },
  init(dot: DotMethods) {
    if (get().inited) return;
    set({ inited: true });
    let t = 0;
    dot.on(
      "friends",
      (data, timestamp) => {
        if (timestamp > t) {
          t = timestamp;
          // 检查数据
          const check =
            Array.isArray(data) &&
            data.every(
              (item) =>
                item.timestamp &&
                item.username &&
                item.address &&
                item.public_key
            );
          if (check) {
            startTransition(() => set({ friends: data }));
          }
        }
      },
      { decrypt: true }
    );
  },
  reset() {
    set({ inited: false, friends: [] });
  },
}));
