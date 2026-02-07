"use client";

import { AppHeader } from "@/components/AppHeader";
import { useUserStore } from "@/stores/userStore";
import { mostCrust } from "@/utils/MostWallet";
import mp from "@/utils/mp";
import {
  Avatar,
  Container,
  Stack,
  Text,
  Button,
  Anchor,
  Paper,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { notifications } from "@mantine/notifications";

// Use Cloudflare Testing Site Key that always passes
const CLOUDFLARE_SITE_KEY = "1x00000000000000000000AA";

const PageContent = () => {
  const wallet = useUserStore((state) => state.wallet);
  const balance = useUserStore((state) => state.balance);
  const initBalance = useUserStore((state) => state.initBalance);

  const [crust_address, setCrustAddress] = useState("-");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (wallet) {
      const { crust_address } = mostCrust(wallet.danger);
      setCrustAddress(crust_address);
    }
  }, [wallet, initBalance]);

  const handleClaim = async () => {
    if (!turnstileToken) {
      notifications.show({ message: "请先完成验证", color: "red" });
      return;
    }

    setClaiming(true);
    try {
      // Mock API call - in production this would be a real fetch to your faucet API
      // await fetch("/api/claim", {
      //   method: "POST",
      //   body: JSON.stringify({ address: crust_address, token: turnstileToken })
      // });

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      notifications.show({
        message: "领取成功！请稍后检查余额。",
        color: "green",
      });
      // Refresh balance after claim
      await initBalance();
    } catch (error) {
      notifications.show({ message: "领取失败，请稍后重试。", color: "red" });
      console.error(error);
    } finally {
      setClaiming(false);
      // Optional: reset turnstile if needed, or leave it
    }
  };

  const isNewUser = !balance || parseFloat(balance) === 0;

  return (
    <Container py="lg" size="sm">
      <AppHeader title="支付 / 充值" />
      <Stack align="center" gap="xl" mt="xl">
        <Stack align="center" gap="xs">
          <Avatar
            size={100}
            radius="lg"
            src={mp.avatar(wallet?.address)}
            alt="头像"
            style={{
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
            }}
          />

          <Text size="sm" c="dimmed">
            {crust_address}
          </Text>
          <Text size="xl" fw={700}>
            余额 {balance || "0"} CRU
          </Text>
        </Stack>

        <Paper withBorder p="xl" radius="md" w="100%">
          {isNewUser ? (
            <Stack align="center">
              <Title order={4}>新用户</Title>
              <Text size="sm" c="dimmed" ta="center">
                检测到您的余额为 0，完成验证即可免费领取 CRU 代币。
              </Text>

              <Turnstile
                siteKey={CLOUDFLARE_SITE_KEY}
                onSuccess={(token) => setTurnstileToken(token)}
                onError={() => setTurnstileToken(null)}
                onExpire={() => setTurnstileToken(null)}
              />

              <Button
                onClick={handleClaim}
                loading={claiming}
                disabled={!turnstileToken}
                fullWidth
                variant="gradient"
                gradient={{ from: "blue", to: "cyan" }}
              >
                领取 CRU
              </Button>
            </Stack>
          ) : (
            <Stack align="center">
              <Title order={4}>充值 CRU</Title>
              <Text size="sm" c="dimmed" ta="center">
                您的余额充足。如需更多 CRU，请前往交易所购买。
              </Text>
              <Anchor
                href="https://www.gate.com/zh/trade/CRU_USDT"
                target="_blank"
                style={{ width: "100%" }}
              >
                <Button fullWidth size="md" variant="filled" color="orange">
                  前往 Gate.io 购买
                </Button>
              </Anchor>
            </Stack>
          )}
        </Paper>
      </Stack>
    </Container>
  );
};

export default function PagePay() {
  return <PageContent />;
}
