"use client";
import { useEffect, useState } from "react";
import {
  Container,
  Text,
  Stack,
  Anchor,
  ActionIcon,
  Group,
  Divider,
} from "@mantine/core";
import { useUserStore } from "@/stores/userStore";
import { AppHeader } from "@/components/AppHeader";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import Link from "next/link";
import mp from "@/utils/mp";

export default function PageWeb3() {
  const wallet = useUserStore((state) => state.wallet);
  const balance = useUserStore((state) => state.balance);

  const [showX25519, setShowX25519] = useState(false);
  const [showCrust, setShowCrust] = useState(false);
  const [ipns, setIPNS] = useState("-");
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    setCurrentTime(Date.now());
  }, []);

  useEffect(() => {
    if (wallet) {
      const ipns = mp.getIPNS(wallet.private_key, wallet.ed_public_key);
      setIPNS(ipns);
    }
  }, [wallet]);

  return (
    <Container py={20} w="61.8%">
      <AppHeader title="Web3" />
      <Stack gap="md">
        <Text size="lg" fw={500}>
          Web3
        </Text>
        <Text>
          旨在重塑互联网生态，将用户的控制权和数据所有权还给个人，推动更加公平和透明的人类社会发展。
        </Text>

        <Anchor component={Link} href="/web3/tools">
          <Text>导出钱包</Text>
        </Anchor>

        <Stack>
          <Text size="lg" fw={500}>
            ETH 地址
          </Text>

          <Group>
            <Text>{wallet?.address.toLowerCase() || "-"}</Text>
            <Anchor
              href={`https://web3.okx.com/zh-hans/portfolio/${wallet?.address || ""}`}
              target="_blank"
            >
              查看
            </Anchor>
          </Group>
        </Stack>

        <Text size="lg" fw={500}>
          Crust 地址
        </Text>
        <Group>
          <Text>{wallet?.crust_address || "-"}</Text>
          <Anchor
            href={`https://crust.subscan.io/account/${wallet?.crust_address || ""}`}
            target="_blank"
          >
            查看
          </Anchor>
        </Group>

        <Stack>
          <Text size="lg" fw={500}>
            余额
          </Text>

          <Group>
            <Text>{balance}</Text>
            <Anchor
              href={`https://crust.subscan.io/account/${wallet?.crust_address || ""}`}
              target="_blank"
            >
              查看
            </Anchor>
          </Group>
        </Stack>

        <Text size="lg" fw={500}>
          Ed25519 公钥
        </Text>
        <Group>
          <Text>{wallet?.ed_public_key || "-"}</Text>
          <Anchor href="/web3/ed25519" component={Link}>
            PEM 格式
          </Anchor>
        </Group>

        <Text size="lg" fw={500}>
          x25519 公钥
        </Text>
        <Text>{wallet?.public_key || "-"}</Text>

        <Text size="lg" fw={500}>
          x25519 & Ed25519 私钥
        </Text>
        <Group align="center" gap="xs">
          <Text size="sm" c="dimmed">
            点击右侧眼睛图标查看私钥
          </Text>
          <ActionIcon
            variant="subtle"
            size="sm"
            ml="xs"
            onClick={() => setShowX25519(!showX25519)}
          >
            {showX25519 ? <IconEye size={16} /> : <IconEyeOff size={16} />}
          </ActionIcon>
        </Group>
        <Text>
          {showX25519 ? wallet?.private_key || "-" : "****************"}
        </Text>

        <Text size="lg" fw={500}>
          Crust 助记词
        </Text>
        <Group align="center" gap="xs">
          <Text size="sm" c="dimmed">
            此助记词用于 Crust 网络交互
          </Text>
          <ActionIcon
            variant="subtle"
            size="sm"
            ml="xs"
            onClick={() => setShowCrust(!showCrust)}
          >
            {showCrust ? <IconEye size={16} /> : <IconEyeOff size={16} />}
          </ActionIcon>
        </Group>
        <Text>
          {showCrust ? wallet?.crust_mnemonic || "-" : "****************"}
        </Text>

        <Text size="lg" fw={500}>
          IPNS ID
        </Text>
        <Text>{ipns}</Text>

        <Divider variant="dashed" labelPosition="center" my="md" />

        <Anchor component={Link} href="/ipns">
          <Text>IPFS 二维码</Text>
        </Anchor>

        <Text>{currentTime ? mp.formatTime(currentTime) : ""}</Text>
      </Stack>
    </Container>
  );
}
