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
import Link from "next/link";
import { api, isDev } from "@/utils/api";

// Use Cloudflare Testing Site Key that always passes
const CLOUDFLARE_SITE_KEY = isDev
  ? "1x00000000000000000000AA"
  : "0x4AAAAAACYq51D8L46dgefZ";

const PageContent = () => {
  const wallet = useUserStore((state) => state.wallet);
  const balance = useUserStore((state) => state.balance);
  const fetchBalance = useUserStore((state) => state.fetchBalance);

  const [crust_address, setCrustAddress] = useState("-");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (wallet) {
      const { crust_address } = mostCrust(wallet.danger);
      setCrustAddress(crust_address);
    }
  }, [wallet]);

  const handleClaim = async () => {
    if (!turnstileToken) {
      notifications.show({ message: "请先完成验证", color: "red" });
      return;
    }

    setClaiming(true);
    try {
      await api.post("/free.claim.cru", {
        turnstileToken,
      });

      notifications.show({
        message: "领取成功！请稍后检查余额。",
        color: "green",
      });
      await fetchBalance();
    } catch (error: any) {
      const message = error.response?.data?.error || "领取失败，请稍后重试。";
      notifications.show({
        message,
        color: "red",
      });
      console.error(error);
    } finally {
      setClaiming(false);
    }
  };

  const isNewUser = !balance || parseFloat(balance) === 0;

  return (
    <Container py="lg" size="sm">
      <AppHeader title="支付 / 充值" />
      <Stack align="center" gap="xl" mt="xl">
        <Avatar
          size={100}
          radius="lg"
          src={mp.avatar(wallet?.address)}
          alt="头像"
          style={{
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
          }}
        />

        <Anchor
          size="sm"
          c="dimmed"
          href={`https://crust.subscan.io/account/${crust_address || ""}`}
          target="_blank"
        >
          {crust_address || "-"}
        </Anchor>

        <Title order={4}>当前余额：{parseFloat(balance) || "0"} CRU</Title>

        {isNewUser && (
          <Paper withBorder p="xl" radius="md" w="100%">
            <Stack align="center">
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
                size="md"
                variant="gradient"
              >
                新用户，免费领取 CRU
              </Button>
            </Stack>
          </Paper>
        )}

        <Paper withBorder p="xl" radius="md" w="100%">
          <Stack align="center">
            <Title order={4}>充值 CRU</Title>
            <Text size="sm" c="dimmed" ta="center">
              如需更多 CRU，请前往交易所购买。
            </Text>

            <Anchor
              component={Link}
              href="https://www.gate.com/zh/trade/CRU_USDT"
              target="_blank"
            >
              前往 Gate.io 购买
            </Anchor>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};

export default function PagePay() {
  return <PageContent />;
}
