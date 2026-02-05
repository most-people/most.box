"use client";

import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
} from "@reown/appkit/react";
import { AppKitProvider } from "@/context/AppKitProvider";
import { BrowserProvider } from "ethers";
import { mostWallet } from "@/utils/MostWallet";
import mp from "@/utils/mp";
import { useUserStore } from "@/stores/userStore";
import { useBack } from "@/hooks/useBack";

function LoginWalletContent() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");
  const setWallet = useUserStore((state) => state.setWallet);
  const back = useBack();

  const LoginWallet = async () => {
    if (!isConnected || !address) {
      open();
      return;
    }
    try {
      const message = "most.box";
      if (!walletProvider) {
        throw new Error("Wallet provider not found");
      }
      const ethersProvider = new BrowserProvider(walletProvider as any);
      const signer = await ethersProvider.getSigner();
      const signature = await signer.signMessage(message);
      const wallet = mostWallet(address, signature, "From Signature");
      const loggedIn = mp.loginSave(wallet);
      if (loggedIn) {
        setWallet(loggedIn);
        back();
      }
    } catch (e) {
      console.error("Login failed", e);
      notifications.show({
        message: "登录失败: " + (e as Error).message,
        color: "red",
      });
    }
  };

  return (
    <Button onClick={LoginWallet} variant={isConnected ? "red" : "light"}>
      {isConnected ? "签名登录" : "连接钱包"}
    </Button>
  );
}

export default function LoginWallet() {
  return (
    <AppKitProvider>
      <LoginWalletContent />
    </AppKitProvider>
  );
}
