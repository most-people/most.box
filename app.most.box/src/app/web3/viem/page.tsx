"use client";

import { AppHeader } from "@/components/AppHeader";
import { Anchor, Container, Stack, Text } from "@mantine/core";
import * as viem from "viem";
import * as accounts from "viem/accounts";
import * as chains from "viem/chains";
import Link from "next/link";
import { useEffect } from "react";

export default function PageWeb3Viem() {
  useEffect(() => {
    (window as any).viem = { ...viem, ...accounts, ...chains };
  }, []);
  return (
    <Container py={20}>
      <AppHeader title="Viem" />
      <Stack>
        <Anchor component={Link} href="https://viem.sh" target="_blank">
          <Text>Viem</Text>
        </Anchor>
        <Text>window.viem</Text>
      </Stack>
    </Container>
  );
}
