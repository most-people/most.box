"use client";

import "./mine.scss";
import Link from "next/link";
import { Avatar, Text, Stack, Group, Box, ActionIcon } from "@mantine/core";
import { Icon, type IconName } from "@/components/Icon";
import { useUserStore } from "@/stores/userStore";
import mp from "@/constants/mp";

export default function HomeMine() {
  const wallet = useUserStore((state) => state.wallet);
  const address = wallet?.address || mp.ZeroAddress;

  const exit = useUserStore((state) => state.exit);

  const quit = () => {
    if (wallet) exit();
  };
  return (
    <>
      <Box className="header">
        <Group wrap="nowrap">
          <Avatar
            component={Link}
            href={`/profile/?address=${address}`}
            size="md"
            radius="sm"
            src={
              wallet?.address
                ? mp.avatar(wallet.address)
                : "/icons/pwa-512x512.png"
            }
            alt="it's me"
          />
          <Box>
            <Text size="lg" fw={500} lineClamp={2}>
              {wallet?.username || "Most.Box"}
            </Text>
            <Text
              size="sm"
              c="dimmed"
              component={Link}
              href={`/profile/?address=${address}`}
            >
              地址: {mp.formatAddress(address)}
            </Text>
          </Box>

          <ActionIcon
            ml={"auto"}
            variant="subtle"
            color="gray"
            component={Link}
            href={{ pathname: "/card", query: { uid: address } }}
          >
            <Icon name="QRCode" size={18} />
          </ActionIcon>
        </Group>
      </Box>
      <Stack className="menu-list" mb="xs" gap={0}>
        <MenuItem icon="Web3" label="Web3" link="/web3" />
        <MenuItem icon="Earth" label="节点" link="/dot" />
        <MenuItem icon="Chat" label="聊天" link="/chat/?id=001" />
      </Stack>
      <Stack className="menu-list" gap={0}>
        <MenuItem icon="About" label="关于" link="/about" />
        <MenuItem icon="Setting" label="设置" link="/setting" />
        <MenuItem icon="Join" label="志同道合" link="/join" />
      </Stack>
      <Stack className="menu-list" mt="xs">
        <MenuItem
          icon="Exit"
          label={wallet ? "退出账户" : "去登录"}
          link="/login"
          onClick={quit}
        />
      </Stack>
    </>
  );
}

interface MenuItemProps {
  icon: IconName;
  label: string;
  link: string;
  onClick?: () => void;
}

function MenuItem({ icon, label, link, onClick }: MenuItemProps) {
  return (
    <Box component={Link} href={link} className="menu-item" onClick={onClick}>
      <Group>
        <Icon name={icon} size={32} />
        <Text>{label}</Text>
      </Group>
      <Icon name="Arrow" size={18} />
    </Box>
  );
}
