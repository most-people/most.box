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
import mp from "@/constants/mp";
import { NETWORK_CONFIG } from "@/constants/dot";
import { formatEther, JsonRpcProvider } from "ethers";

export default function PageWeb3() {
  const wallet = useUserStore((state) => state.wallet);
  const [showX25519, setShowX25519] = useState(false);
  const [balance, setBalance] = useState("-");

  const fetchBalance = () => {
    if (wallet) {
      const RPC = NETWORK_CONFIG["mainnet"].rpc;
      const provider = new JsonRpcProvider(RPC);
      // 获取余额
      provider.getBalance(wallet.address).then((balance) => {
        setBalance(formatEther(balance));
      });
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [wallet]);

  return (
    <Container py={20}>
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

        <Text size="lg" fw={500}>
          ETH 地址
        </Text>

        <Group>
          <Text>{wallet?.address || "-"}</Text>
          <Anchor
            href={`https://basescan.org/address/${wallet?.address || ""}`}
            target="_blank"
          >
            查看
          </Anchor>
        </Group>

        <Text size="lg" fw={500}>
          余额
        </Text>
        <Text>{balance} Base ETH</Text>

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

        <Group align="center" gap="xs">
          <Text size="lg" fw={500}>
            x25519 & Ed25519 私钥
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
        <Text>{showX25519 ? wallet?.private_key || "-" : "-"}</Text>

        <Divider variant="dashed" labelPosition="center" my="md" />

        <Anchor component={Link} href="/web3/ethers">
          <Text>Ethers</Text>
        </Anchor>

        <Anchor component={Link} href="/game/5">
          <Text>五子棋</Text>
        </Anchor>

        <Anchor component={Link} href="/game/black">
          <Text>黑白棋</Text>
        </Anchor>

        <Anchor component={Link} href="/game/21">
          <Text>二十一点</Text>
        </Anchor>

        <Anchor component={Link} href="/cid">
          <Text>CID 二维码</Text>
        </Anchor>

        <Text>{mp.formatTime(Date.now())}</Text>
      </Stack>
    </Container>
  );
}
