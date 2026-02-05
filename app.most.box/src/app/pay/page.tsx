"use client";

import { AppHeader } from "@/components/AppHeader";
import { useUserStore } from "@/stores/userStore";
import { mostCrust } from "@/utils/MostWallet";
import mp from "@/utils/mp";
import { Avatar, Container, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
const PageContent = () => {
  const wallet = useUserStore((state) => state.wallet);
  const balance = useUserStore((state) => state.balance);

  const [crust_address, setCrustAddress] = useState("-");

  useEffect(() => {
    if (wallet) {
      const { crust_address } = mostCrust(wallet.danger);
      setCrustAddress(crust_address);
    }
  }, [wallet]);

  return (
    <Container py="lg" size="sm">
      <AppHeader title="支付" />
      <Stack align="center">
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
        <Text size="sm" c="dimmed">
          余额 {balance} CRU
        </Text>
      </Stack>
    </Container>
  );
};

export default function PagePay() {
  return <PageContent />;
}
