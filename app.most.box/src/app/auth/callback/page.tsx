"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container, Loader, Text } from "@mantine/core";
import { supabase } from "@/constants/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Auth callback error:", error);
          router.push("/login/google?error=auth_failed");
          return;
        }

        if (data.session) {
          console.log("🌊", data);
          // 登录成功，重定向到主页面
          router.push("/");
        } else {
          // 没有会话，重定向回登录页面
          router.push("/login/google");
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        router.push("/login/google?error=unexpected");
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <Container size={420} my={40}>
      <div style={{ textAlign: "center" }}>
        <Loader size="lg" mb={20} />
        <Text>正在处理登录...</Text>
      </div>
    </Container>
  );
}
