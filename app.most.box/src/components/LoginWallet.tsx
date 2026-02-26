"use client";

import {
  Button,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useActiveAccount, useConnectModal } from "thirdweb/react";
import { client } from "@/utils/thirdweb";
import Thirdweb from "@/context/Thirdweb";
import { mostWallet } from "@/utils/MostWallet";
import { useUserStore } from "@/stores/userStore";
import { useBack } from "@/hooks/useBack";
import { createWallet, inAppWallet } from "thirdweb/wallets";

const wallets = [
  inAppWallet({
    auth: {
      options: ["passkey", "google", "apple", "email"],
    },
  }),
  createWallet("com.okex.wallet"),
];

const LoginWalletContent = () => {
  const account = useActiveAccount();
  const setWallet = useUserStore((state) => state.setWallet);
  const back = useBack();
  const { colorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light");
  const { connect } = useConnectModal();

  const theme = colorScheme === "auto" ? computedColorScheme : colorScheme;

  const handleSign = async () => {
    if (!account) return;

    try {
      const message = "most.box";
      // 使用 Thirdweb account 签名
      const signature = await account.signMessage({ message });

      // 生成本地钱包实例
      const walletInstance = mostWallet(
        account.address,
        signature,
        "From Signature",
      );
      setWallet(walletInstance);
      back();
    } catch (e: any) {
      console.info("Sign failed", e);
      notifications.show({
        title: "签名失败",
        message: e.message || "请重试",
        color: "red",
      });
    }
  };

  const handleConnect = async () => {
    try {
      await connect({
        showThirdwebBranding: false,
        client,
        wallets,
        locale: "zh_CN",
        theme: theme === "dark" ? "dark" : "light",
      });
    } catch (error) {
      console.error("Connect failed", error);
    }
  };

  if (!account) {
    return (
      <Button onClick={handleConnect} variant="light">
        快捷登录
      </Button>
    );
  }

  return (
    <Button onClick={handleSign} variant="red">
      签名认证
    </Button>
  );
};

export default function LoginWallet() {
  return (
    <Thirdweb>
      <LoginWalletContent />
    </Thirdweb>
  );
}
