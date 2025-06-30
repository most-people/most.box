"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Container,
  Paper,
  Title,
  Text,
  Alert,
  LoadingOverlay,
} from "@mantine/core";
import { IconBrandGoogle, IconAlertCircle } from "@tabler/icons-react";
import { supabase } from "@/constants/supabase";

export default function GoogleLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 检查是否已经登录
    const checkUser = async () => {
      const res = await supabase.auth.getUser();
      const user = res.data.user;
      if (user) {
        console.log("🌊", user);
        router.push("/"); // 根据你的应用调整重定向路径
      }
    };

    checkUser();

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push("/"); // 根据你的应用调整重定向路径
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Google login error:", error);
      setError(error instanceof Error ? error.message : "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" mb={30}>
        Google 登录
      </Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md" pos="relative">
        <LoadingOverlay visible={loading} />

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="登录错误"
            color="red"
            mb={20}
          >
            {error}
          </Alert>
        )}

        <Text c="dimmed" size="sm" ta="center" mb={20}>
          使用你的 Google 账户登录
        </Text>

        <Button
          fullWidth
          leftSection={<IconBrandGoogle size={18} />}
          variant="default"
          onClick={handleGoogleLogin}
          disabled={loading}
          size="md"
        >
          使用 Google 登录
        </Button>

        <Text c="dimmed" size="xs" ta="center" mt={20}>
          登录即表示你同意我们的服务条款和隐私政策
        </Text>
      </Paper>
    </Container>
  );
}
