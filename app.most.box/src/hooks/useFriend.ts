import { useFriendStore } from "@/stores/friendStore";
import { NotifyValue, useUserStore } from "@/stores/userStore";
import { notifications } from "@mantine/notifications";
import { DotMethods, mostDecode, mostEncode } from "dot.most.box";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

export interface Message {
  text: string;
  address: string;
  timestamp: number;
  type?: "text" | "image" | "audio" | "video" | "file";
}

export interface Friend {
  address: string;
  username: string;
  public_key: string;
  timestamp: number;
}

export const useFriend = (friendAddress: string) => {
  const router = useRouter();
  const wallet = useUserStore((state) => state.wallet);
  const dotClient = useUserStore((state) => state.dotClient);
  const dot = useUserStore((state) => state.dot);

  const addFriend = useFriendStore((state) => state.addFriend);

  const [myMessages, setMyMessages] = useState<Message[]>([]);
  const [friendMessages, setFriendMessages] = useState<Message[]>([]);

  const messages = [...myMessages, ...friendMessages].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  const [friend, setFriend] = useState<Friend | null>(null);
  const [friendDot, setFriendDot] = useState<DotMethods | null>(null);

  useEffect(() => {
    if (dot && friend && friendDot && wallet) {
      // 监听消息
      let t = 0;
      dot.on(friend.address, (data, timestamp) => {
        if (timestamp > t) {
          t = timestamp;
          // 检查数据
          try {
            data = JSON.parse(
              mostDecode(data, friend.public_key, wallet.private_key)
            );
            if (
              Array.isArray(data) &&
              data.every((item) => typeof item?.timestamp === "number")
            ) {
              startTransition(() => setMyMessages(data));
            }
          } catch (error) {
            console.log("解析json失败", error);
          }
        }
      });

      // 判断是否是自己
      if (friend.address !== wallet.address) {
        let t = 0;
        friendDot.on(wallet.address, (data, timestamp) => {
          if (timestamp > t) {
            t = timestamp;
            // 检查数据
            try {
              data = JSON.parse(
                mostDecode(data, friend.public_key, wallet.private_key)
              );
              if (
                Array.isArray(data) &&
                data.every((item) => typeof item?.timestamp === "number")
              ) {
                startTransition(() => setFriendMessages(data));
              }
            } catch (error) {
              console.log("解析json失败", error);
            }
          }
        });
      }

      // 清理监听器，防止内存泄漏
      return () => {
        dot.off(friend.address);
        friendDot.off(wallet.address);
      };
    }
  }, [dot, friend, friendDot, wallet]);

  useEffect(() => {
    if (friendAddress && dotClient) {
      const friendDot = dotClient.dot(friendAddress);
      setFriendDot(friendDot);
      let t = 0;
      friendDot.on("info", (info, timestamp) => {
        if (timestamp > t) {
          t = timestamp;
          const username = info?.username;
          const public_key = info?.public_key;
          if (username && public_key) {
            // 成功获取，停止监听
            friendDot.off("info");
            addFriend(username, friendAddress, public_key);
            setFriend({
              address: friendAddress,
              username,
              public_key,
              timestamp,
            });
          }
        }
      });

      return () => {
        friendDot.off("info");
      };
    }
  }, [friendAddress, dotClient]);

  const send = (text: string) => {
    if (!wallet) {
      router.push("/login");
      return;
    }
    if (dot && friend) {
      const timestamp = Date.now();
      const newMessage = {
        text,
        address: wallet.address,
        timestamp,
      };
      // 更新数据
      dot.put(
        friendAddress,
        mostEncode(
          JSON.stringify([...myMessages, newMessage]),
          friend.public_key,
          wallet.private_key
        )
      );
      const value: NotifyValue = {
        type: "friend",
        username: wallet.username,
        public_key: wallet.public_key,
        text,
      };
      dot.notify(friendAddress, value);
    }
  };

  const del = (message: Message) => {
    if (wallet && dot && friend) {
      // 更新数据
      const data = JSON.stringify(
        myMessages.filter((item) => item.timestamp !== message.timestamp)
      );
      dot.put(
        friendAddress,
        mostEncode(data, friend.public_key, wallet.private_key)
      );
    }
  };

  const clear = () => {
    if (wallet && dot && friend) {
      // 清空我发送的消息
      const data = JSON.stringify([]);
      dot.put(
        friendAddress,
        mostEncode(data, friend.public_key, wallet.private_key)
      );
      // 清空本地状态
      setMyMessages([]);
      notifications.show({ message: "已清空", color: "gray" });
    }
  };

  return { friend, messages, send, del, clear };
};
