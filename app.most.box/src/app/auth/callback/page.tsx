"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container, Loader, Stack, Text } from "@mantine/core";
import { supabase } from "@/constants/supabase";
import mp from "@/constants/mp";
import { useUserStore } from "@/stores/userStore";

export default function AuthCallback() {
  const router = useRouter();
  const setItem = useUserStore((state) => state.setItem);

  const authCallback = async (password: string) => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Auth callback error:", error);
        router.push("/login?error=auth_failed");
        return;
      }
      const user = data.session?.user;
      if (user) {
        const username = user.email || user.id.slice(-6);
        password = [user.created_at, user.id, "most.box!" + password].join("|");
        const wallet = mp.login(username, password);
        if (wallet) {
          setTimeout(() => {
            setItem("wallet", wallet);
          }, 0);
        }
        // 登录成功，重定向到主页面
        router.replace("/");
      } else {
        // 没有会话，重定向回登录页面
        router.push("/login");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };

  useEffect(() => {
    authCallback("");
  }, []);

  return (
    <Container>
      <Stack align="center">
        <Loader size="lg" />
        <Text>正在处理登录...</Text>
      </Stack>
    </Container>
  );
}
