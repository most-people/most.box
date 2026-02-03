"use client";
import { Text, Group, ActionIcon, TextVariant, Menu } from "@mantine/core";
import { Icon } from "@/components/Icon";
import { useBack } from "@/hooks/useBack";
import { useDocumentTitle } from "@mantine/hooks";
import Link from "next/link";

interface AppHeaderProps {
  title: string | string[];
  variant?: TextVariant;
  left?: React.ReactNode;
  right?: React.ReactNode;
}
export const AppHeader = ({ title, variant, right, left }: AppHeaderProps) => {
  const back = useBack();
  useDocumentTitle(title as string);
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
              leftSection={<Icon name="Earth" size={16} />}
              component={Link}
              href="/dot"
            >
              我的节点
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
};
