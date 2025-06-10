"use client";

import { useDisclosure } from "@mantine/hooks";
import {
  Text,
  Input,
  Button,
  Stack,
  Divider,
  PasswordInput,
  Avatar,
  Anchor,
  Box,
  Space,
} from "@mantine/core";

import "./login.scss";
import Link from "next/link";
import { useState } from "react";
import mp from "@/constants/mp";
import { mostWallet } from "@/constants/MostWallet";
import { useUserStore } from "@/stores/userStore";
import { useAccountStore } from "@/stores/accountStore";
import { notifications } from "@mantine/notifications";
import { useBack } from "@/hooks/useBack";

export default function PageLogin() {
  const back = useBack();
  const [visible, { toggle }] = useDisclosure(true);

  const setItem = useUserStore((state) => state.setItem);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const connectOKX = useAccountStore((state) => state.connectOKX);
  const ethereum = useAccountStore((state) => state.ethereum);

  const [connectLoading, setConnectLoading] = useState(false);

  const connectWallet = async () => {
    try {
      setConnectLoading(true);
      const signer = await connectOKX();
      if (signer) {
        const address = await signer.getAddress();
        const sig = await signer.signMessage(address);
        login(address.slice(-4), sig);
      }
    } catch (error) {
      setConnectLoading(false);
      console.log("钱包连接失败", error);
      notifications.show({ title: "提示", message: "连接失败" });
    }
  };

  const login = (username: string, password: string) => {
    if (username) {
      const wallet = mp.login(username, password);
      if (wallet) {
        setTimeout(() => {
          setItem("wallet", wallet);
        }, 0);
      }
    }
    setConnectLoading(true);
    back();
  };

  return (
    <Box id="page-login">
      <Stack gap="md">
        <Box className="header">
          <Text size="xl" fw={500}>
            Most.Box
          </Text>
          <Space h="sx" />
          <Avatar
            size="xl"
            radius="md"
            src={
              username
                ? mp.avatar(mostWallet(username, password).address)
                : "/icons/pwa-512x512.png"
            }
            alt="it's me"
          />
        </Box>
        <Stack gap="md">
          <Input
            autoFocus
            placeholder="用户名"
            value={username}
            onChange={(event) => setUsername(event.currentTarget.value)}
          />
          <PasswordInput
            placeholder="密码"
            visible={visible}
            onVisibilityChange={toggle}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />
          <Button onClick={() => login(username, password)} variant="gradient">
            {username ? "登录" : "游客"}
          </Button>

          {ethereum && (
            <>
              <Divider label="Or" labelPosition="center" />
              <Button
                variant="default"
                loading={connectLoading}
                loaderProps={{ type: "dots" }}
                onClick={connectWallet}
              >
                连接钱包
              </Button>
            </>
          )}
          <Anchor
            component={Link}
            href="/about"
            style={{ textAlign: "center" }}
          >
            完全去中心化，无需注册
          </Anchor>
        </Stack>
      </Stack>
    </Box>
  );
}
