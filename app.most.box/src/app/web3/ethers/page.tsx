"use client";

import { Anchor, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import { ethers } from "ethers";
import Link from "next/link";
import { useEffect } from "react";

export default function Web3EthersPage() {
  useEffect(() => {
    (window as any).ethers = ethers;
    (window as any).dayjs = dayjs;
  }, []);
  return (
    <Stack>
      <Anchor
        component={Link}
        href="https://docs.ethers.org/v6/migrating/"
        target="_blank"
      >
        <Text>Ethers v6</Text>
      </Anchor>
      <Text>window.ethers</Text>
      <Anchor
        component={Link}
        href="https://day.js.org/docs/zh-CN/display/format"
        target="_blank"
      >
        <Text>Day.js</Text>
      </Anchor>
      <Text>window.dayjs</Text>
    </Stack>
  );
}
