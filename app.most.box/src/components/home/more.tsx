import { ActionIcon, Menu } from "@mantine/core";
import { Icon } from "@/components/Icon";
import { useRef } from "react";
import { api } from "@/constants/api";
import { notifications } from "@mantine/notifications";
import { useUserStore } from "@/stores/userStore";

const HomeMore = ({ homeTab }: { homeTab: string | null }) => {
  const wallet = useUserStore((state) => state.wallet);
  const setItem = useUserStore((state) => state.setItem);
  const filesPath = useUserStore((state) => state.filesPath);

  const tarInputRef = useRef<HTMLInputElement>(null);

  const handleImportTar = () => {
    tarInputRef.current?.click();
  };

  const handleTarFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件格式
    if (!file.name.endsWith(".tar")) {
      notifications.show({
        title: "格式错误",
        message: "只支持 .tar 格式的压缩包",
        color: "red",
      });
      return;
    }

    const notificationId = notifications.show({
      title: "导入中",
      message: "正在解压并导入文件...",
      color: "blue",
      autoClose: false,
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", filesPath);

      const res = await api.put("/files.import", formData);

      notifications.update({
        id: notificationId,
        title: "导入成功",
        message: res.data.message,
        color: "green",
        autoClose: true,
      });

      // 导入成功后刷新文件列表
      try {
        const res = await api.post(`/files/${filesPath}`);
        setItem("files", res.data);
      } catch (error) {
        console.error(error);
      }
    } catch (error: any) {
      const message = error?.response?.data || "导入失败，请重试";
      notifications.update({
        id: notificationId,
        title: "导入失败",
        message,
        color: "red",
        autoClose: true,
      });
    }

    // 清空input值，允许重复选择同一文件
    event.target.value = "";
  };

  if (homeTab === "disk") {
    return (
      <>
        <Menu shadow="md">
          <Menu.Target>
            <ActionIcon variant="transparent" color="--text-color">
              <Icon name="More" size={24} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item
              leftSection="📁"
              onClick={handleImportTar}
              disabled={!wallet}
            >
              导入 tar 压缩包
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>

        {/* 隐藏的tar文件输入框 */}
        <input
          ref={tarInputRef}
          type="file"
          accept=".tar"
          style={{ display: "none" }}
          onChange={handleTarFileChange}
        />
      </>
    );
  }
  return (
    <ActionIcon variant="transparent" color="--text-color">
      <Icon name="More" size={24} />
    </ActionIcon>
  );
};

export default HomeMore;
