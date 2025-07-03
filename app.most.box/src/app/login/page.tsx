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
  Group,
  ActionIcon,
  Tooltip,
  Modal,
  TextInput,
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
import { supabase } from "@/constants/supabase";
import { Provider } from "@supabase/supabase-js";
import { Icon } from "@/components/Icon";
import { SupabaseURL } from "@/constants/api";
import Script from "next/script";

interface TelegramAuthData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export default function PageLogin() {
  const back = useBack();
  const [visible, { toggle }] = useDisclosure(true);
  const [emailModalOpened, { open: openEmailModal, close: closeEmailModal }] =
    useDisclosure(false);

  const setItem = useUserStore((state) => state.setItem);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // 邮箱格式验证函数
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const connectOKX = useAccountStore((state) => state.connectOKX);
  const ethereum = useAccountStore((state) => state.ethereum);

  const [connectLoading, setConnectLoading] = useState(false);

  const connectWallet = async () => {
    try {
      setConnectLoading(true);
      const signer = await connectOKX();
      if (signer) {
        const address = await signer.getAddress();
        const sig = await signer.signMessage(
          "Connect wallet " + address + " by dot.most.box"
        );
        login(address.slice(-4), sig);
      }
    } catch (error) {
      console.log("钱包连接失败", error);
      notifications.show({ title: "提示", message: "连接失败" });
    } finally {
      setConnectLoading(false);
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
    back();
  };

  const loginTelegram = () => {
    const Telegram = (window as any).Telegram;
    if (!Telegram) {
      notifications.show({ title: "提示", message: "Telegram 不存在" });
      return;
    }
    Telegram.Login.auth(
      {
        bot_id: "7848968061",
        request_access: "write",
        embed: 1,
      },
      (authData: TelegramAuthData) => {
        console.log("🌊", authData);
        postTelegram(authData);
      }
    );
  };

  const postTelegram = async (authData: TelegramAuthData) => {
    try {
      const { data, error } = await supabase.functions.invoke("telegram-auth", {
        body: { authData },
      });
      console.log("🌊", data, error);
      if (data.success && data.redirect_url) {
        notifications.show({
          color: "green",
          title: "登录成功",
          message: "正在跳转...",
        });
        // 重定向到认证链接
        window.location.href = data.redirect_url;
      } else {
        throw new Error(data.error || "登录失败");
      }
    } catch (error) {
      console.error("Telegram login error:", error);
      notifications.show({
        color: "red",
        title: "登录失败",
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  const loginWith = async (provider: Provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: SupabaseURL },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "登录失败，请重试",
      });
    }
  };

  const loginEmail = async () => {
    // 提交前验证邮箱格式
    if (!email) {
      setEmailError("请输入邮箱地址");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("请输入有效的邮箱地址");
      return;
    }

    try {
      setEmailLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: { emailRedirectTo: SupabaseURL },
      });

      if (error) {
        throw error;
      }

      notifications.show({
        color: "green",
        message: "验证邮件已发送，请检查您的邮箱",
      });

      closeEmailModal();
      setEmail(""); // 清空邮箱输入
      setEmailError(""); // 清空错误信息
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "登录失败，请重试",
      });
    } finally {
      setEmailLoading(false);
    }
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

          <Divider label="Or" labelPosition="center" />

          <Group justify="center" gap="md">
            <Tooltip label="使用邮箱登录">
              <ActionIcon size="lg" variant="default" onClick={openEmailModal}>
                <Icon name="Mail" />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="使用 X 登录">
              <ActionIcon
                size="lg"
                variant="default"
                onClick={() => loginWith("twitter")}
              >
                <Icon name="X" />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="使用 Google 登录">
              <ActionIcon
                size="lg"
                variant="default"
                onClick={() => loginWith("google")}
              >
                <Icon name="Google" />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="使用 Github 登录">
              <ActionIcon
                size="lg"
                variant="default"
                onClick={() => loginWith("github")}
              >
                <Icon name="Github" />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="使用 Discord 登录">
              <ActionIcon
                size="lg"
                variant="default"
                onClick={() => loginWith("discord")}
              >
                <Icon name="Discord" />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="使用 Telegram 登录">
              <ActionIcon size="lg" variant="default" onClick={loginTelegram}>
                <Icon name="Telegram" />
              </ActionIcon>
            </Tooltip>
          </Group>

          {ethereum && (
            <Button
              variant="default"
              loading={connectLoading}
              loaderProps={{ type: "dots" }}
              onClick={connectWallet}
            >
              连接钱包
            </Button>
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

      {/* 邮箱登录弹窗 */}
      <Modal
        opened={emailModalOpened}
        onClose={closeEmailModal}
        title="邮箱登录"
        centered
      >
        <Stack gap="md">
          <TextInput
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.currentTarget.value);
              setEmailError("");
            }}
            error={emailError}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeEmailModal}>
              取消
            </Button>
            <Button loading={emailLoading} onClick={loginEmail}>
              发送邮件
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Script src="https://telegram.org/js/telegram-widget.js"></Script>
    </Box>
  );
}
