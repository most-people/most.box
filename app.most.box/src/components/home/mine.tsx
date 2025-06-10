"use client";

import "./mine.scss";
import Link from "next/link";
import { Avatar, Text, Stack, Group, Box, ActionIcon } from "@mantine/core";
import { Icon, type IconName } from "@/components/Icon";
import { notifications } from "@mantine/notifications";
import { useUserStore } from "@/stores/userStore";
import { useTopicStore } from "@/stores/topicStore";
import mp from "@/constants/mp";
import { useFriendStore } from "@/stores/friendStore";

export default function HomeMine() {
  const wallet = useUserStore((state) => state.wallet);
  const address = wallet?.address || mp.ZeroAddress;

  const exit = useUserStore((state) => state.exit);
  const resetTopic = useTopicStore((state) => state.reset);
  const resetFriend = useFriendStore((state) => state.reset);

  const quit = () => {
    setTimeout(() => {
      exit();
      resetTopic();
      resetFriend();
    }, 1000);
  };
  return (
    <>
      <Box className="header">
        <Group wrap="nowrap">
          <Avatar
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
            <Text size="sm" c="dimmed">
              地址: {mp.formatAddress(address)}
            </Text>
          </Box>

          <ActionIcon
            ml={"auto"}
            variant="subtle"
            color="gray"
            onClick={() =>
              notifications.show({ title: "二维码", message: "开发中" })
            }
          >
            <Icon name="qr-code" size={18} />
          </ActionIcon>
        </Group>
      </Box>
      <Stack className="menu-list" mb="xs">
        <MenuItem icon="web3" label="Web3" link="/web3" />
      </Stack>
      <Stack className="menu-list" gap={0}>
        <MenuItem icon="about" label="关于" link="/about" />
        <MenuItem icon="setting" label="设置" link="/setting" />
        <MenuItem icon="join" label="志同道合" link="/join" />
        <MenuItem icon="download" label="节点更新" link="/dot" />
      </Stack>
      <Stack className="menu-list" mt="xs">
        <MenuItem
          icon="exit"
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
      <Icon name="arrow" size={18} />
    </Box>
  );
}
