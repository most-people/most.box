"use client";

import { useDisclosure } from "@mantine/hooks";
import {
  Text,
  Input,
  Button,
  Stack,
  PasswordInput,
  Avatar,
  Anchor,
  Container,
  Divider,
} from "@mantine/core";

import Link from "next/link";
import { useState } from "react";
import mp from "@/utils/mp";
import { mostWallet } from "@/utils/MostWallet";
import { useUserStore } from "@/stores/userStore";
import { notifications } from "@mantine/notifications";
import { useBack } from "@/hooks/useBack";
import { AppHeader } from "@/components/AppHeader";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
} from "@reown/appkit/react";
import { BrowserProvider } from "ethers";

export default function PageLogin() {
  const back = useBack();
  const [visible, { toggle }] = useDisclosure(false);

  const setWallet = useUserStore((state) => state.setWallet);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const isLogin = Boolean(username || password);

  // Reown hooks
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");

  const walletLogin = async () => {
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

  const login = () => {
    if (!username) {
      notifications.show({ message: "请输入昵称" });
      return;
    }
    if (!password) {
      notifications.show({ message: "请输入密码" });
      return;
    }
    const wallet = mp.login(username, password);
    if (wallet) {
      setTimeout(() => {
        setWallet(wallet);
      }, 0);
    }
    back();
  };

  return (
    <Container maw={424} w="100%">
      <AppHeader title="登录" />
      <Stack gap="md" mt="md">
        <Stack align="center">
          <Text size="xl">Most People</Text>
          <Avatar
            size="xl"
            radius="md"
            src={mp.avatar(
              username ? mostWallet(username, password).address : undefined,
            )}
            alt="it's me"
          />
        </Stack>
        <Stack gap="md">
          <Input
            autoFocus
            placeholder="昵称"
            value={username}
            onChange={(event) => setUsername(event.currentTarget.value)}
            onKeyUp={(event) => {
              if (event.key === "Enter" && isLogin) {
                login();
              }
            }}
          />
          <PasswordInput
            placeholder="密码"
            visible={visible}
            onVisibilityChange={toggle}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            onKeyUp={(event) => {
              if (event.key === "Enter" && isLogin) {
                login();
              }
            }}
          />

          <Button onClick={isLogin ? login : back} variant="gradient">
            {isLogin ? "登录" : "游客"}
          </Button>

          <Anchor
            component={Link}
            href="/about"
            style={{ textAlign: "center" }}
          >
            完全去中心化，无需注册
          </Anchor>
        </Stack>
        <Divider label="Or" labelPosition="center" />
        <Button onClick={walletLogin} variant={isConnected ? "red" : "light"}>
          {isConnected ? "签名登录" : "连接钱包"}
        </Button>
      </Stack>
    </Container>
  );
}
