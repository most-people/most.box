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
  Progress,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { notifications } from "@mantine/notifications";
import Link from "next/link";
import { api, isDev } from "@/utils/api";
import { CRUST_SUBSCAN } from "@/utils/crust";

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
  const [progress, setProgress] = useState(0);

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
    setProgress(0);
    try {
      await api.post("free.claim.cru", {
        json: {
          turnstileToken,
        },
      });

      notifications.show({
        message: "领取请求已提交，正在确认余额...",
        color: "blue",
      });

      // 轮询查询余额，最多 10 次，每次 5 秒
      let success = false;
      for (let i = 0; i < 10; i++) {
        setProgress((i + 1) * 10);
        await new Promise((r) => setTimeout(r, 5000));
        await fetchBalance();
        const currentBalance = useUserStore.getState().balance;
        if (parseFloat(currentBalance || "0") > 0) {
          success = true;
          break;
        }
      }

      setProgress(100);

      if (success) {
        notifications.show({
          message: "领取成功！余额已更新。",
          color: "green",
        });
      } else {
        notifications.show({
          message: "领取成功！区块链确认较慢，请稍后刷新查看。",
          color: "green",
        });
      }
    } catch (error: any) {
      let message = "领取失败，请稍后重试。";
      try {
        const errorData = await error.response?.json();
        if (errorData?.error) {
          message = errorData.error;
        }
      } catch {}

      notifications.show({
        message,
        color: "red",
      });
      console.error(error);
    } finally {
      setClaiming(false);
      setProgress(0);
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
          href={`${CRUST_SUBSCAN}/account/${crust_address || ""}`}
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
              {claiming && (
                <Progress
                  value={progress}
                  size="sm"
                  w="100%"
                  animated
                  striped
                />
              )}
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
