import "./chat.scss";
import { useEffect, useState } from "react";
import {
  Box,
  Text,
  Group,
  Avatar,
  Tabs,
  Flex,
  Badge,
  ActionIcon,
  Menu,
} from "@mantine/core";
import {
  IconSearch,
  IconPlus,
  IconMessage,
  IconUserPlus,
  IconQrcode,
  IconWallet,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import Link from "next/link";
import mp from "@/constants/mp";
import dayjs from "dayjs";
import { type Friend } from "@/constants/chat";

interface FriendItemProps {
  friend: Friend;
}

export const FriendItem = ({ friend }: FriendItemProps) => {
  const friendRead = (address: string) => {
    console.log("address", address);
  };
  return (
    <Link
      onClick={() => friendRead(friend.address)}
      href={{
        pathname: "/friend",
        hash: friend.address,
      }}
    >
      <Group wrap="nowrap" justify="space-between" className="chat">
        <Group wrap="nowrap">
          <Avatar src={mp.avatar(friend.address)} size="lg" radius="md" />
          <Box>
            <Group gap={8} wrap="nowrap">
              <Text fw={500}>{friend.username}</Text>
              <Box style={{ position: "relative" }}>
                <Badge
                  color="red"
                  size="xs"
                  variant="filled"
                  className="badge-notify"
                />
              </Box>
            </Group>
            <Text size="sm" c="dimmed">
              {mp.formatAddress(friend.address)}
            </Text>
          </Box>
        </Group>
        <Flex direction="column" align="flex-end" gap={5}>
          <Text size="xs" c="dimmed">
            {dayjs(friend.timestamp).fromNow()}
          </Text>
        </Flex>
      </Group>
    </Link>
  );
};

export default function HomeChat() {
  const [chatTab, setChatTab] = useState<string | null>("friends");
  const tabChange = (value: string | null) => {
    setChatTab(value);
    localStorage.setItem("chatTab", value || "friends");
  };

  useEffect(() => {
    const activeTab = localStorage.getItem("chatTab");
    setChatTab(activeTab || "friends");
  }, []);

  return (
    <Tabs value={chatTab} onChange={tabChange} variant="outline">
      <Box className="chat-header">
        <Tabs.List>
          <Tabs.Tab value="friends" fw={500}>
            好友
          </Tabs.Tab>
          <Tabs.Tab value="topics" fw={500}>
            话题
          </Tabs.Tab>
        </Tabs.List>

        <Group className="action">
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => notifications.show({ message: "开发中" })}
          >
            <IconSearch size={24} stroke={1.5} />
          </ActionIcon>
          <Menu
            shadow="md"
            position="bottom-end"
            withArrow
            arrowPosition="center"
          >
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconPlus size={24} stroke={1.5} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconMessage size={24} />}
                component={Link}
                href="/topic"
              >
                <Text>加入话题</Text>
              </Menu.Item>
              <Menu.Item
                leftSection={<IconUserPlus size={24} />}
                component={Link}
                href="/friend"
              >
                <Text>添加好友</Text>
              </Menu.Item>
              <Menu.Item
                leftSection={<IconQrcode size={24} />}
                component={Link}
                href="/scan"
              >
                <Text>扫一扫</Text>
              </Menu.Item>
              <Menu.Item
                leftSection={<IconWallet size={24} />}
                component={Link}
                href="/pay"
              >
                <Text>收付款</Text>
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Box>
    </Tabs>
  );
}
