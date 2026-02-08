"use client";
import { Text, Group, ActionIcon, TextVariant, Menu } from "@mantine/core";
import { Icon } from "@/components/Icon";
import { useBack } from "@/hooks/useBack";
import { useDocumentTitle } from "@mantine/hooks";
import Link from "next/link";
import {
  IconFileImport,
  IconPackageExport,
  IconCloudUpload,
  IconWallet,
} from "@tabler/icons-react";
import { useUserStore } from "@/stores/userStore";
import { useBackup } from "@/hooks/useBackup";

interface AppHeaderProps {
  title: string | string[];
  variant?: TextVariant;
  left?: React.ReactNode;
  right?: React.ReactNode;
}
export const AppHeader = ({ title, variant, right, left }: AppHeaderProps) => {
  const back = useBack();
  useDocumentTitle(title as string);
  const balance = useUserStore((state) => state.balance);
  const { handleExport, handleImport } = useBackup();

  return (
    <Group className="app-header">
      {left ? (
        left
      ) : (
        <ActionIcon variant="transparent" onClick={back} color="--text-color">
          <Icon name="Back" size={24} />
        </ActionIcon>
      )}
      <Text lineClamp={2} variant={variant || "gradient"}>
        {title}
      </Text>
      {right ? (
        right
      ) : (
        <Menu shadow="md" position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="transparent" color="--text-color">
              <Icon name="More" size={24} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconWallet size={18} />}
              component={Link}
              href="/pay"
            >
              {parseFloat(balance || "0")} CRU
            </Menu.Item>

            <Menu.Divider />

            <Menu.Item
              leftSection={<IconCloudUpload size={18} />}
              component={Link}
              href="/sync"
            >
              数据同步
            </Menu.Item>

            <Menu.Divider />

            <Menu.Item
              leftSection={<Icon name="Earth" size={16} />}
              component={Link}
              href="/dot"
            >
              我的节点
            </Menu.Item>

            <Menu.Divider />

            <Menu.Item
              leftSection={<IconPackageExport size={18} />}
              onClick={handleExport}
            >
              备份到本地
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFileImport size={18} />}
              onClick={handleImport}
            >
              从本地恢复
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
};
