"use client";

import "./mine.scss";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Text,
  Stack,
  Group,
  Box,
  ActionIcon,
  Button,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { Icon, type IconName } from "@/components/Icon";
import { useUserStore } from "@/stores/userStore";
import mp from "@/utils/mp";
import { handleExport } from "@/utils/backup";

export default function HomeMine() {
  const router = useRouter();
  const wallet = useUserStore((state) => state.wallet);
  const address = wallet?.address || mp.ZeroAddress;
  const exit = useUserStore((state) => state.exit);

  const quit = () => {
    modals.open({
      title: "退出警告",
      centered: true,
      children: (
        <Stack>
          <Stack>
            <Text size="sm" c="dimmed">
              退出登录将清除本地所有内容。
            </Text>
            <Text size="sm" c="dimmed">
              是否已经备份好数据？
            </Text>
          </Stack>
          <Group justify="flex-end">
            <Button
              size="sm"
              variant="light"
              color="blue"
              onClick={() => {
                handleExport();
                modals.closeAll();
              }}
            >
              备份到本地
            </Button>
            <Button
              size="sm"
              variant="light"
              color="green"
              onClick={() => {
                modals.closeAll();
                router.push("/sync");
              }}
            >
              同步到链上
            </Button>
            <Button
              size="sm"
              color="red"
              onClick={() => {
                modals.closeAll();
                exit();
              }}
            >
              确认退出
            </Button>
          </Group>
        </Stack>
      ),
    });
  };

  return (
    <>
      <Box className="header">
        <Group wrap="nowrap">
          <Avatar
            size="md"
            radius="sm"
            src={mp.avatar(wallet?.address)}
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
            component={Link}
            href={{ pathname: "/card", query: { address } }}
          >
            <Icon name="QRCode" size={18} />
          </ActionIcon>
        </Group>
      </Box>
      <Stack className="menu-list" mb="xs" gap={0}>
        <MenuItem icon="Web3" label="Web3" link="/web3" />
        <MenuItem icon="Website" label="主页" link={`/@${address}`} />
        <MenuItem icon="Earth" label="节点" link="/dot" />
        <MenuItem icon="Chat" label="聊天" link="/chat/?id=001" />
      </Stack>
      <Stack className="menu-list" gap={0}>
        <MenuItem icon="About" label="关于" link="/about" />
        <MenuItem icon="Setting" label="设置" link="/setting" />
        <MenuItem icon="Join" label="志同道合" link="/join" />
      </Stack>
      <Stack className="menu-list" mt="xs">
        {wallet ? (
          <MenuItem
            icon="Exit"
            label="退出账户"
            link="#"
            onClick={(e) => {
              e.preventDefault();
              quit();
            }}
          />
        ) : (
          <MenuItem icon="Exit" label="去登录" link="/login" />
        )}
      </Stack>
    </>
  );
}

interface MenuItemProps {
  icon: IconName;
  label: string;
  link: string;
  onClick?: (e: any) => void;
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
