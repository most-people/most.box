import { startTransition, useEffect, useState } from "react";
import { type MostWallet, type DotMethods } from "dot.most.box";
import { useUserStore } from "@/stores/userStore";
import { HDNodeWallet } from "ethers";
import { type Message } from "@/hooks/useFriend";
import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";

const DotKey = "messages";

export const useTopic = (topicWallet: MostWallet | null) => {
  const wallet = useUserStore((state) => state.wallet);
  const dot = useUserStore((state) => state.dot);
  const dotClient = useUserStore((state) => state.dotClient);
  const router = useRouter();

  const [dotTopic, setDotTopic] = useState<DotMethods | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (topicWallet && dotClient) {
      const signer = HDNodeWallet.fromPhrase(topicWallet.mnemonic);
      const dot = dotClient.dot(topicWallet.address);
      dot.setSigner(signer);
      dot.setPubKey(topicWallet.public_key);
      dot.setPrivKey(topicWallet.private_key);
      setDotTopic(dot);

      let t = 0;
      dot.on(
        DotKey,
        (data, timestamp) => {
          if (timestamp > t) {
            t = timestamp;
            if (data) {
              // 检查数据
              if (
                Array.isArray(data) &&
                data.every((item) => typeof item?.timestamp === "number")
              ) {
                startTransition(() => setMessages(data));
              }
            }
          }
        },
        { decrypt: true }
      );
      // 清理监听器，防止内存泄漏
      return () => {
        dot.off(DotKey);
      };
    }
  }, [topicWallet, dotClient]);

  const send = (text: string) => {
    if (!wallet) {
      router.push("/login");
      return;
    }
    if (dotTopic) {
      const timestamp = Date.now();
      const newMessage = {
        text,
        address: wallet.address,
        timestamp,
      };
      // 更新数据
      dotTopic.put(DotKey, [...messages, newMessage], true);
      if (topicWallet && dot) {
        dot.notify(topicWallet.address, {
          type: "topic",
          username: wallet.username,
          public_key: wallet.public_key,
          text,
        });
      }
    }
  };

  const del = (message: Message) => {
    if (wallet && dotTopic) {
      // 更新数据
      dotTopic.put(
        DotKey,
        messages.filter((item) => item.timestamp !== message.timestamp),
        true
      );
    }
  };

  const clear = () => {
    if (wallet && dotTopic) {
      // 过滤掉当前用户发送的所有消息
      const filter = messages.filter(
        (message) => message.address !== wallet.address
      );
      // 更新数据
      dotTopic.put(DotKey, filter, true);
      notifications.show({ message: "已清空", color: "gray" });
    }
  };

  return { messages, send, clear, del };
};
