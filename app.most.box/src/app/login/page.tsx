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
  Group,
  ActionIcon,
  Tooltip,
  Modal,
  TextInput,
  Container,
} from "@mantine/core";

import Link from "next/link";
import { useState, useEffect } from "react";
import mp from "@/constants/mp";
import { mostWallet } from "@/constants/MostWallet";
import { useUserStore } from "@/stores/userStore";
import { notifications } from "@mantine/notifications";
import { useBack } from "@/hooks/useBack";
import { supabase } from "@/constants/supabase";
import { type Provider } from "@supabase/supabase-js";
import { Icon } from "@/components/Icon";
import { SupabaseURL } from "@/constants/api";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { modals } from "@mantine/modals";

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
  const router = useRouter();
  const back = useBack();
  const [visible, { toggle }] = useDisclosure(true);
  const [emailModalOpened, { open: openEmailModal, close: closeEmailModal }] =
    useDisclosure(false);

  const setWallet = useUserStore((state) => state.setWallet);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const isLogin = Boolean(username || password);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // 新增验证码相关状态
  const [verificationCode, setVerificationCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 倒计时效果
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // 邮箱格式验证函数
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

  const loginTelegram = () => {
    const Telegram = (window as any).Telegram;
    if (!Telegram) {
      notifications.show({ title: "提示", message: "Telegram 不存在" });
      return;
    }
    if (location.host !== "most.box") {
      modals.openConfirmModal({
        centered: true,
        title: "提示",
        children: (
          <Text c="dimmed">需要在 most.box 域名下登录，是否继续？</Text>
        ),
        labels: { confirm: "继续", cancel: "取消" },
        onConfirm: () => window.open("https://most.box/login"),
      });
      return;
    }

    Telegram.Login.auth(
      {
        bot_id: "7848968061",
        request_access: "write",
        embed: 1,
      },
      (authData: TelegramAuthData) => {
        if (authData) {
          postTelegram(authData);
        }
      }
    );
  };

  const postTelegram = async (authData: TelegramAuthData) => {
    try {
      const { data, error } = await supabase.functions.invoke("telegram-auth", {
        body: { authData },
      });

      if (error) {
        throw error;
      }

      if (data.success && data.redirect_url) {
        notifications.show({
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

      setEmailSent(true);
      setCountdown(60); // 开始60秒倒计时
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

  // 新增验证码验证函数
  const verifyCode = async () => {
    if (!verificationCode) {
      setCodeError("请输入验证码");
      return;
    }

    try {
      setVerifyLoading(true);
      const { error } = await supabase.auth.verifyOtp({
        email: email,
        token: verificationCode,
        type: "email",
      });

      if (error) {
        throw error;
      }

      notifications.show({
        color: "green",
        message: "验证成功，正在登录...",
      });

      router.replace("/auth/callback");
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : "验证失败，请重试");
    } finally {
      setVerifyLoading(false);
    }
  };

  // 重置邮箱模态框状态
  const closeModal = () => {
    setEmail("");
    setEmailError("");
    setVerificationCode("");
    setCodeError("");
    setEmailSent(false);
    setCountdown(0);
    // 关闭模态框
    closeEmailModal();
  };

  // 重新发送邮件
  const resendEmail = () => {
    if (countdown > 0) return;
    loginEmail();
  };

  return (
    <Container maw={424} w="100%">
      <AppHeader title="登录" />
      <Stack gap="md" mt="md">
        <Stack align="center">
          <Text size="xl" fw={500}>
            Most.Box
          </Text>
          <Avatar
            size="xl"
            radius="md"
            src={mp.avatar(
              username ? mostWallet(username, password).address : undefined
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
        onClose={closeModal}
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
            disabled={emailSent}
          />

          {emailSent && (
            <Group align="flex-end" gap="xs">
              <TextInput
                placeholder="请输入验证码"
                value={verificationCode}
                onChange={(event) => {
                  setVerificationCode(event.currentTarget.value);
                  setCodeError("");
                }}
                error={codeError}
                style={{ flex: 1 }}
              />
              <Button
                variant="light"
                onClick={resendEmail}
                disabled={countdown > 0}
              >
                {countdown > 0 ? `再次发送 ${countdown}s` : "再次发送"}
              </Button>
            </Group>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal}>
              取消
            </Button>

            {!emailSent ? (
              <Button loading={emailLoading} onClick={loginEmail}>
                发送邮件
              </Button>
            ) : (
              <Button loading={verifyLoading} onClick={verifyCode}>
                验证
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
      <Script src="https://telegram.org/js/telegram-widget.js"></Script>
    </Container>
  );
}
