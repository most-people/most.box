"use client";

import { AppHeader } from "@/components/AppHeader";
import { useUserStore } from "@/stores/userStore";
import { Container } from "@mantine/core";
import { useEffect } from "react";

export default function PageDemo() {
  const wallet = useUserStore((state) => state.wallet);

  useEffect(() => {
    if (wallet) {
      console.log(wallet.ed_public_key);
      console.log(wallet.ed_private_key);
    }
  }, [wallet]);
  return (
    <Container py={20}>
      <AppHeader title="demo" />
    </Container>
  );
}
