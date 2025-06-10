"use client";
import mp from "@/constants/mp";
import Nodes, { ContractOnline } from "@/constants/nodes";
import { useAccountStore } from "@/stores/accountStore";
import { useFriendStore } from "@/stores/friendStore";
import { useTopicStore } from "@/stores/topicStore";
import { useUserStore } from "@/stores/userStore";
import { DotClient, type DotMethods } from "dot.most.box";
import { HDNodeWallet } from "ethers";
import { useEffect } from "react";

export default function AppProvider() {
  const setItem = useUserStore((state) => state.setItem);
  const initWallet = useUserStore((state) => state.initWallet);
  const initAccount = useAccountStore((state) => state.initAccount);
  const initTopic = useTopicStore((state) => state.init);
  const initFriend = useFriendStore((state) => state.init);
  // profile
  const wallet = useUserStore((state) => state.wallet);
  const dotClient = useUserStore((state) => state.dotClient);
  const onlineUpdate = useUserStore((state) => state.onlineUpdate);

  useEffect(() => {
    initWallet();
    initAccount();
    setItem("firstPath", window.location.pathname);
    setItem("dotClient", new DotClient(Nodes));
  }, []);

  const initOnline = (dotClient: DotClient) => {
    const onlineDot = dotClient.dot(ContractOnline);
    onlineDot.on("notify", (data) => {
      onlineUpdate(data);
    });
  };

  // 初始化
  const init = (dot: DotMethods) => {
    initTopic(dot);
    initFriend(dot);
  };

  useEffect(() => {
    if (dotClient) {
      initOnline(dotClient);
      // 已登录
      if (wallet) {
        const signer = HDNodeWallet.fromPhrase(wallet.mnemonic);
        const dot = dotClient.dot(wallet.address);
        dot.setSigner(signer);
        dot.setPubKey(wallet.public_key);
        dot.setPrivKey(wallet.private_key);
        setItem("dot", dot);
        init(dot);

        // 心跳检测
        const heartbeat = () => {
          dot.notify(ContractOnline, wallet.username);
        };
        // 立即执行一次
        heartbeat();
        // 然后每分钟执行一次
        setInterval(heartbeat, 60000);

        // 公布自己的公钥和用户名
        dot.on("info", (info) => {
          const { username, public_key } = info || {};
          if (
            username !== wallet.username ||
            public_key !== wallet.public_key
          ) {
            dot.put("info", {
              username: wallet.username,
              public_key: wallet.public_key,
            });
          }
          dot.off("info");
        });
        let t = 0;
        dot.on("notify", (data, timestamp) => {
          if (timestamp > t) {
            t = timestamp;
            setItem("notify", data);
            // 叮咚
            mp.playSound();
          }
        });
      }
    }
  }, [wallet, dotClient]);
  return null;
}
