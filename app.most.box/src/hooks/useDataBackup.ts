"use client";

import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
import { useUserStore } from "@/stores/userStore";
import { useRouter } from "next/navigation";

export const useDataBackup = () => {
  const router = useRouter();
  const exportData = useUserStore((state) => state.exportData);
  const wallet = useUserStore((state) => state.wallet);
  const importData = useUserStore((state) => state.importData);

  const handleExport = () => {
    if (!wallet) {
      notifications.show({ message: "请先登录", color: "red" });
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
      notifications.show({ message: "请先登录", color: "red" });
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

  return {
    handleExport,
    handleImport,
  };
};
