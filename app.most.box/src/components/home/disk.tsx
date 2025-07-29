"use client";
import { useEffect, useState, useRef } from "react";
import {
  Text,
  Group,
  Stack,
  Paper,
  ActionIcon,
  Button,
  Modal,
  ScrollArea,
  Center,
  Anchor,
  Box,
  Tooltip,
} from "@mantine/core";
import { api } from "@/constants/api";
import "./disk.scss";
import Link from "next/link";
import {
  IconUpload,
  IconFolderPlus,
  IconX,
  IconRefresh,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { FileItem, useUserStore } from "@/stores/userStore";

interface PreviewFile {
  file: File;
  path: string;
  size: string;
}

export default function HomeDisk() {
  const wallet = useUserStore((state) => state.wallet);
  const dotCID = useUserStore((state) => state.dotCID);
  const files = useUserStore((state) => state.files);
  const filesPath = useUserStore((state) => state.filesPath);
  const setItem = useUserStore((state) => state.setItem);
  const [uploading, setUploading] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async (path: string = "") => {
    try {
      const res = await api.post(`/files/${path}`);
      setItem("files", res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const uploadFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        // 如果在子目录中，需要包含当前路径
        const path = file.webkitRelativePath;
        const filePath = filesPath ? `${filesPath}/${path}` : path;
        formData.append("path", filePath);

        const res = await api.put("/files.upload", formData);

        const cid = res.data?.cid;
        if (cid) {
          notifications.show({
            title: "上传成功",
            message: `文件 ${file.name} 上传成功`,
            color: "green",
          });
        }
      }

      // 上传完成后刷新文件列表
      await fetchFiles(filesPath);
      setShowPreview(false);
      setPreviewFiles([]);
    } catch (error: any) {
      let message = error?.response?.data || "文件上传失败，请重试";
      if (message.includes("already has")) {
        message = "文件已存在";
      }
      notifications.show({
        title: "上传失败",
        message,
        color: "red",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFolderUpload = () => {
    folderInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      // 如果是单个文件且不是文件夹上传，直接上传
      if (fileArray.length === 1 && !fileArray[0].webkitRelativePath) {
        uploadFiles(fileArray);
      } else {
        // 多个文件或文件夹上传才显示预览
        const previewData: PreviewFile[] = fileArray.map((file) => ({
          file,
          path: file.webkitRelativePath || file.name,
          size: formatFileSize(file.size),
        }));
        setPreviewFiles(previewData);
        setShowPreview(true);
      }
    }
    // 清空input值，允许重复选择同一文件
    event.target.value = "";
  };

  const handleConfirmUpload = () => {
    const files = previewFiles.map((item) => item.file);
    uploadFiles(files);
  };

  const handleCancelUpload = () => {
    setShowPreview(false);
    setPreviewFiles([]);
  };

  const removePreviewFile = (index: number) => {
    const newPreviewFiles = previewFiles.filter((_, i) => i !== index);
    setPreviewFiles(newPreviewFiles);
    if (newPreviewFiles.length === 0) {
      setShowPreview(false);
    }
  };

  const getTotalSize = () => {
    const totalBytes = previewFiles.reduce(
      (sum, item) => sum + item.file.size,
      0
    );
    return formatFileSize(totalBytes);
  };

  // 在组件中添加删除函数
  const deleteFile = async (fileName: string) => {
    try {
      // 构建完整的文件路径
      const filePath = filesPath ? `${filesPath}/${fileName}` : fileName;
      await api.delete(`/files/${filePath}`);

      notifications.show({
        title: "删除成功",
        message: `文件 ${fileName} 已删除`,
        color: "green",
      });

      // 删除成功后刷新文件列表
      await fetchFiles(filesPath);
    } catch (error) {
      console.error("删除失败:", error);
      notifications.show({
        title: "删除失败",
        message: `删除文件 ${fileName} 失败，请重试`,
        color: "red",
      });
    }
  };

  // 添加确认删除的函数
  const handleDeleteFile = (item: FileItem) => {
    const confirmed = window.confirm(`确定要删除文件 "${item.name}" 吗？`);
    if (confirmed) {
      deleteFile(item.name);
    }
  };

  // 处理文件夹点击
  const handleFolderClick = (folderName: string) => {
    const newPath = filesPath ? `${filesPath}/${folderName}` : folderName;
    setItem("filesPath", newPath);
    fetchFiles(newPath);
  };

  // 处理后退
  const handleGoBack = () => {
    const pathParts = filesPath.split("/");
    pathParts.pop(); // 移除最后一个路径部分
    const newPath = pathParts.join("/");
    setItem("filesPath", newPath);
    fetchFiles(newPath);
  };

  useEffect(() => {
    if (wallet && !files) {
      fetchFiles(filesPath);
    }
  }, [wallet, files]);

  if (!wallet) {
    return (
      <Center>
        <Button variant="gradient" component={Link} href="/login">
          去登录
        </Button>
      </Center>
    );
  }

  return (
    <Box>
      <Stack align="center" gap={0} p="md">
        <Group gap={4}>
          <span>当前节点</span>
          <Anchor component={Link} href={dotCID + "/ipfs/"} target="_blank">
            {dotCID + "/ipfs/"}
          </Anchor>
        </Group>
      </Stack>

      <Stack gap="md" p="md">
        {/* 隐藏的文件输入框 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          // eslint-disable-next-line
          // @ts-ignore
          webkitdirectory=""
          multiple
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        <Group mb="md" justify="space-between">
          <Group gap="sm">
            <Tooltip label="刷新">
              <ActionIcon
                color="blue"
                size="lg"
                onClick={() => fetchFiles(filesPath)}
              >
                <IconRefresh />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="上传文件">
              <ActionIcon
                color="green"
                size="lg"
                onClick={handleFileUpload}
                disabled={uploading}
              >
                <IconUpload />
              </ActionIcon>
            </Tooltip>
          </Group>

          <Tooltip label="上传文件夹">
            <ActionIcon
              color="yellow"
              size="lg"
              onClick={handleFolderUpload}
              disabled={uploading}
            >
              <IconFolderPlus />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Stack>
          {/* 后退目录项 */}
          {filesPath && (
            <Paper
              p="md"
              withBorder
              radius="md"
              style={{ cursor: "pointer" }}
              onClick={handleGoBack}
            >
              <Group justify="space-between" align="center">
                <Group align="center">
                  <Text fw={500}>📁 ..</Text>
                </Group>
              </Group>
            </Paper>
          )}

          {files?.map((item, index) => (
            <Paper
              key={index}
              p="md"
              withBorder
              radius="md"
              style={{
                cursor: item.type === "directory" ? "pointer" : "default",
              }}
              onClick={() => {
                if (item.type === "directory") {
                  handleFolderClick(item.name);
                }
              }}
            >
              <Group justify="space-between" align="center">
                <Group align="center">
                  <Text fw={500}>
                    {item.type === "directory" ? "📁" : "📄"} {item.name}
                  </Text>
                </Group>
                <Group align="center">
                  <Stack gap={4} align="flex-end">
                    {item.size > 0 && (
                      <Text size="sm" c="dimmed">
                        {formatFileSize(item.size)}
                      </Text>
                    )}
                  </Stack>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    component={Link}
                    href={`${dotCID}/ipfs/${item.cid["/"]}?filename=${item.name}`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()} // 阻止事件冒泡
                  >
                    🔍
                  </ActionIcon>
                  {!(item.type === "directory" && item.name === ".note") && (
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={(e) => {
                        e.stopPropagation(); // 阻止事件冒泡
                        handleDeleteFile(item);
                      }}
                    >
                      🗑️
                    </ActionIcon>
                  )}
                </Group>
              </Group>
            </Paper>
          ))}

          {files?.length === 0 && (
            <Text ta="center" size="lg" c="dimmed">
              暂无文件
            </Text>
          )}
        </Stack>

        {/* 文件预览模态框 */}
        <Modal
          opened={showPreview}
          onClose={handleCancelUpload}
          title="文件预览"
          size="lg"
          centered
        >
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                共 {previewFiles.length} 个文件，总大小: {getTotalSize()}
              </Text>
            </Group>

            <ScrollArea h={300}>
              <Stack gap="xs">
                {previewFiles.map((item, index) => (
                  <Paper key={index} p="sm" withBorder>
                    <Group justify="space-between" align="center" wrap="nowrap">
                      <Group align="center">
                        <Text size="sm">📄</Text>
                        <Stack gap={2}>
                          <Text size="sm" fw={500}>
                            {item.path}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {item.size}
                          </Text>
                        </Stack>
                      </Group>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        onClick={() => removePreviewFile(index)}
                      >
                        <IconX />
                      </ActionIcon>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </ScrollArea>

            <Group justify="flex-end" gap="sm">
              <Button
                variant="outline"
                onClick={handleCancelUpload}
                disabled={uploading}
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmUpload}
                loading={uploading}
                disabled={previewFiles.length === 0}
              >
                确认上传
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Box>
  );
}
