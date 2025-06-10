import { create } from "zustand";
import { Notify, NotifyValue, useUserStore } from "@/stores/userStore";
import { startTransition } from "react";
import { type DotMethods } from "dot.most.box";
import mp from "@/constants/mp";

export interface Topic {
  name: string;
  password: string;
  address: string;
  timestamp: number;
}

interface TopicStore {
  inited: boolean;
  topics: Topic[];
  topicInfo: Record<string, Record<string, Notify>>;
  topicRead: (address: string) => void;
  join: (name: string, password: string, address: string) => void;
  quit: (address: string) => void;
  init: (dot: DotMethods) => void;
  reset: () => void;
}

interface State extends TopicStore {
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

export const useTopicStore = create<State>((set, get) => ({
  inited: false,
  topics: [],
  topicInfo: {},
  topicRead(address) {
    const topics = get().topics;
    const updatedTopics = topics.map((topic) => {
      if (topic.address === address) {
        return {
          ...topic,
          timestamp: Date.now(),
        };
      }
      return topic;
    });

    // 更新状态
    set({ topics: updatedTopics });

    const dot = useUserStore.getState().dot;
    if (dot) {
      dot.put("topics", updatedTopics, true);
    }
  },
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
  join(name: string, password: string, address: string) {
    // 检查登录
    const dot = useUserStore.getState().dot;
    const wallet = useUserStore.getState().wallet;
    if (dot && wallet) {
      // 检查是否已经存在，避免重复添加
      const topics = get().topics;
      if (!topics.some((e) => e.address === address)) {
        const timestamp = Date.now();
        const data: Topic = { name, password, address, timestamp };
        dot.put("topics", [data, ...topics], true);
        const value: NotifyValue = {
          type: "topic",
          username: wallet.username,
          public_key: wallet.public_key,
          text: "来了",
        };
        dot.notify(address, value);
      }
    }
  },
  quit(address: string) {
    // 检查登录
    const dot = useUserStore.getState().dot;
    if (dot) {
      const topics = get().topics;
      // 检查是否已经删除，避免重复删除
      const filter = topics.filter((e) => e.address !== address);
      if (filter.length < topics.length) {
        dot.put("topics", filter, true);
      }
    }
  },
  init(dot: DotMethods) {
    if (get().inited) return;
    set({ inited: true });
    let t = 0;
    dot.on(
      "topics",
      (data, timestamp) => {
        if (timestamp > t) {
          t = timestamp;
          // 检查数据
          const check =
            Array.isArray(data) &&
            data.every((item) => item.timestamp && item.name);
          if (check) {
            const topics: Topic[] = data;
            startTransition(() => set({ topics }));
            // 查询详情
            const dotClient = useUserStore.getState().dotClient;
            if (dotClient) {
              for (const topic of topics) {
                const topicDot = dotClient.dot(topic.address);

                let t = 0;
                topicDot.on("notify", (data, timestamp) => {
                  if (timestamp > t) {
                    t = timestamp;
                    if (data) {
                      mp.playSound();
                      set((state) => ({
                        topicInfo: {
                          ...state.topicInfo,
                          [topic.address]: data,
                        },
                      }));
                    }
                  }
                });
              }
            }
          }
        }
      },
      { decrypt: true }
    );
  },
  reset() {
    set({ inited: false, topics: [] });
  },
}));
