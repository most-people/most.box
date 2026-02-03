"use client";
import dayjs from "dayjs";
import { Text, Group, ActionIcon, TextVariant, Menu } from "@mantine/core";
import { Icon } from "@/components/Icon";
import { useBack } from "@/hooks/useBack";
import { useDocumentTitle } from "@mantine/hooks";
import Link from "next/link";
import { IconFileImport, IconPackageExport } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useUserStore } from "@/stores/userStore";
import { useRouter } from "next/navigation";

interface AppHeaderProps {
  title: string | string[];
  variant?: TextVariant;
  left?: React.ReactNode;
  right?: React.ReactNode;
}
export const AppHeader = ({ title, variant, right, left }: AppHeaderProps) => {
  const back = useBack();
  const router = useRouter();
  useDocumentTitle(title as string);

  const exportData = useUserStore((state) => state.exportData);
  const wallet = useUserStore((state) => state.wallet);
  const importData = useUserStore((state) => state.importData);

  const handleExport = () => {
    if (!wallet) {
      notifications.show({
        message: "请先登录",
        color: "red",
      });
      router.push("/login");
      return;
    }
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${wallet?.address.slice(-4)}-most-box-${dayjs().format("YYYY-MM-DD")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notifications.show({
      title: "导出成功",
      message: "数据已成功备份到本地文件",
      color: "green",
    });
  };

  const handleImport = () => {
    if (!wallet) {
      notifications.show({
        message: "请先登录",
        color: "red",
      });
      router.push("/login");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.notes || data.files) {
            importData(data);
            notifications.show({
              title: "导入成功",
              message: "数据已成功恢复",
              color: "green",
            });
          } else {
            throw new Error("无效的备份文件格式");
          }
        } catch (error) {
          notifications.show({
            title: "导入失败",
            message: "文件解析失败或格式不正确",
            color: "red",
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

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

            <Menu.Divider />

            <Menu.Item
              leftSection={<IconPackageExport size={18} />}
              onClick={handleExport}
            >
              备份数据
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFileImport size={18} />}
              onClick={handleImport}
            >
              恢复数据
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
};
