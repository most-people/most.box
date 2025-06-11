"use client";
import { useEffect, useState, useRef } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  Box,
  Text,
  Group,
  Stack,
  Paper,
  ActionIcon,
  Button,
  Modal,
  ScrollArea,
} from "@mantine/core";
import { api, DotCID } from "@/constants/api";
import "./files.scss";
import Link from "next/link";
import { IconUpload, IconFolderPlus, IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

interface FileItem {
  name: string;
  type: "file" | "directory";
  size: number;
  cid: {
    "/": string;
  };
}

interface PreviewFile {
  file: File;
  path: string;
  size: string;
}

export default function PageDotFiles() {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    try {
      const res = await api.post("/files/");
      setFileList(res.data);
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
        formData.append("path", file.webkitRelativePath);

        await api.put("/files.upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        notifications.show({
          title: "上传成功",
          message: `文件 ${file.name} 上传成功`,
          color: "green",
        });
      }

      // 上传完成后刷新文件列表
      await fetchFiles();
      setShowPreview(false);
      setPreviewFiles([]);
    } catch (error) {
      console.error("上传失败:", error);
      notifications.show({
        title: "上传失败",
        message: "文件上传失败，请重试",
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
      const previewData: PreviewFile[] = fileArray.map((file) => ({
        file,
        path: file.webkitRelativePath || file.name,
        size: formatFileSize(file.size),
      }));

      setPreviewFiles(previewData);
      setShowPreview(true);
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

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <Box id="page-dot-files">
      <AppHeader title="文件列表" />
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

        <Group mb="md" gap="sm">
          <ActionIcon
            variant="filled"
            color="blue"
            size="lg"
            onClick={handleFolderUpload}
            disabled={uploading}
          >
            <IconFolderPlus />
          </ActionIcon>
          <ActionIcon
            variant="filled"
            color="green"
            size="lg"
            onClick={handleFileUpload}
            disabled={uploading}
          >
            <IconUpload />
          </ActionIcon>
        </Group>

        {/* 文件预览模态框 */}
        <Modal
          opened={showPreview}
          onClose={handleCancelUpload}
          title="文件预览"
          size="lg"
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
                    <Group justify="space-between" align="center">
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
                        color="red"
                        size="sm"
                        onClick={() => removePreviewFile(index)}
                      >
                        <IconX size={14} />
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
                确认上传 ({previewFiles.length})
              </Button>
            </Group>
          </Stack>
        </Modal>

        {fileList.map((item, index) => (
          <Paper key={index} p="md" withBorder radius="md">
            <Group justify="space-between" align="center">
              <Group align="center">
                <Text size="lg">{item.type === "directory" ? "📁" : "📄"}</Text>
                <Stack gap={4}>
                  <Text fw={500}>{item.name}</Text>
                  <Text size="sm" c="dimmed">
                    CID: {item.cid["/"]}
                  </Text>
                </Stack>
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
                  href={`${DotCID}/ipfs/${item.cid["/"]}?filename=${item.name}`}
                  target="_blank"
                >
                  🔍
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => {
                    /* 删除逻辑 */
                  }}
                >
                  🗑️
                </ActionIcon>
              </Group>
            </Group>
          </Paper>
        ))}
        {fileList.length === 0 && (
          <Text ta="center" c="dimmed">
            暂无文件
          </Text>
        )}
      </Stack>
    </Box>
  );
}
