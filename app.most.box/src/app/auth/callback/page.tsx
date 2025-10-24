"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Loader,
  Stack,
  Text,
  Modal,
  Button,
  Group,
  Alert,
  PasswordInput,
} from "@mantine/core";
import { supabase } from "@/constants/supabase";
import mp from "@/constants/mp";
import { useUserStore } from "@/stores/userStore";
import { type Session } from "@supabase/supabase-js";
import { useDisclosure, useHash } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";

export default function AuthCallback() {
  const router = useRouter();
  const setWallet = useUserStore((state) => state.setWallet);
  const [hash] = useHash();

  const [visible, { toggle }] = useDisclosure(false);
  const [fundPassword, setFundPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [currentUser, setCurrentUser] = useState<Session["user"] | null>(null);

  const passwordSubmit = () => {
    if (!passwordInput) {
      setPasswordError("请输入密码");
      return;
    }

    setFundPassword(passwordInput);
    setShowPasswordModal(false);
    if (currentUser) {
      completeLogin(currentUser, passwordInput);
    }
  };

  const skipPasswordSetup = () => {
    setShowPasswordModal(false);
    if (currentUser) {
      completeLogin(currentUser, "");
    }
  };

  const completeLogin = (user: Session["user"], password: string) => {
    const username = user.email || user.id.slice(-6);
    const walletPassword = [
      user.created_at,
      user.id,
      "most.box!" + password,
    ].join("|");
    const wallet = mp.login(username, walletPassword);
    if (wallet) {
      setTimeout(() => {
        setWallet(wallet);
      }, 0);
    }
    // 登录成功，重定向到主页面
    router.replace("/");
  };

  const authCallback = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Auth callback error:", error);
        return;
      }
      const user = data.session?.user;
      if (user) {
        // 退出登录
        supabase.auth.signOut();
        setCurrentUser(user);
        if (!fundPassword) {
          // 询问用户是否需要设置密码
          setShowPasswordModal(true);
        } else {
          completeLogin(user, fundPassword);
        }
      } else {
        // 没有会话，重定向回登录页面
        router.push("/login");
      }
    } catch (error) {
      console.error("Get session error:", error);
    }
  };

  useEffect(() => {
    authCallback();
  }, []);

  useEffect(() => {
    if (hash) {
      const params = new URLSearchParams(hash.slice(1));
      if (params.get("error")) {
        console.error("Auth callback error:", hash);
        notifications.show({
          color: "red",
          title: params.get("error"),
          message: params.get("error_description"),
        });
      }
    }
  }, [hash]);

  return (
    <Container>
      <Stack align="center">
        <Loader size="lg" />
        <Text>正在处理登录...</Text>
      </Stack>

      <Modal
        opened={showPasswordModal}
        onClose={() => {}}
        closeOnClickOutside={false}
        closeOnEscape={false}
        withCloseButton={false}
        centered
      >
        <Stack>
          <Alert>为了确保资金安全，即使社交账户被盗也能保护您的资产。</Alert>

          <PasswordInput
            placeholder="建议您设置密码"
            visible={visible}
            onVisibilityChange={toggle}
            value={passwordInput}
            onChange={(event) => {
              setPasswordInput(event.currentTarget.value);
              setPasswordError("");
            }}
            error={passwordError}
          />

          <Group justify="space-between">
            <Button variant="outline" onClick={skipPasswordSetup}>
              不设置密码
            </Button>
            <Button onClick={passwordSubmit}>设置密码</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
