"use client";
import { useEffect, useState, useRef } from "react";
import {
  Text,
  Group,
  Stack,
  ActionIcon,
  Button,
  Modal,
  ScrollArea,
  Center,
  Tooltip,
  TextInput,
  Grid,
  Card,
  Menu,
  Badge,
} from "@mantine/core";
import { api } from "@/constants/api";
import "./disk.scss";
import Link from "next/link";
import {
  IconFolderPlus,
  IconX,
  IconRefresh,
  IconDotsVertical,
  IconPlus,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { FileItem, useUserStore } from "@/stores/userStore";
import mp from "@/constants/mp";

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
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async (path: string) => {
    try {
      setLoading(true);
      const res = await api.post(`/files/${path}`);
      setItem("files", res.data);
    } catch (error) {
      console.error(error);
      notifications.show({
        message: (error as Error).message,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 过滤文件列表
  const filteredFiles = files
    ? files
        .filter((file) => mp.pinyin(file.name, searchQuery, 0))
        // 文件夹在前，文件在后
        .sort((a, b) => {
          if (a.type === "directory" && b.type !== "directory") return -1;
          if (a.type !== "directory" && b.type === "directory") return 1;
          // 同类型按名称排序
          // return a.name.localeCompare(b.name);
          return 0;
        })
    : [];

  // 获取当前显示的文件列表
  const displayedFiles = filteredFiles.slice(0, displayCount);
  const hasMore = filteredFiles.length > displayCount;

  // 加载更多函数
  const loadMore = () => {
    setDisplayCount((prev) => prev + 100);
  };

  // 重置显示数量（搜索时使用）
  useEffect(() => {
    setDisplayCount(100);
  }, [searchQuery]);

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
        formData.append("path", filePath + file.name);
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

  // 删除文件函数
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

  // 确认删除的函数
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

  // 打开文件
  const handleOpenFile = (item: FileItem) => {
    const url = `${dotCID}/ipfs/${item.cid["/"]}?filename=${item.name}`;
    window.open(url, "_blank");
  };

  // 分享文件
  const handleShareFile = (item: FileItem) => {
    const url = `${dotCID}/ipfs/${item.cid["/"]}?filename=${item.name}`;

    if (navigator.share) {
      navigator.share({
        title: `文件: ${item.name}`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        notifications.show({
          color: "green",
          message: "分享链接已复制到剪贴板",
        });
      });
    }
  };

  // 下载文件
  const formatDownload = (item: FileItem) => {
    if (item.type === "directory") {
      // 文件夹压缩为 tar 下载
      return `${dotCID}/ipfs/${item.cid["/"]}?download=true&format=tar&filename=${item.name}.tar`;
    } else {
      // 文件直接下载
      return `${dotCID}/ipfs/${item.cid["/"]}?download=true&filename=${item.name}`;
    }
  };

  useEffect(() => {
    if (wallet && !files) {
      fetchFiles(filesPath);
    }
  }, [wallet, files]);

  if (!wallet) {
    return (
      <Center>
        <Button mt={200} variant="gradient" component={Link} href="/login">
          去登录
        </Button>
      </Center>
    );
  }

  return (
    <>
      {files?.length ? (
        <Stack gap="md" p="md" className="disk-box">
          {/* 搜索框 */}
          <Center>
            <TextInput
              placeholder="搜索文件名称"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
              size="md"
              radius="md"
              w={400}
              styles={{
                input: {
                  textAlign: "center",
                },
              }}
            />
          </Center>

          <Group justify="space-between" align="center">
            <Badge variant="light" size="lg">
              {searchQuery
                ? `显示 ${displayedFiles.length} / ${filteredFiles.length} (总共 ${files.length})`
                : `显示 ${displayedFiles.length} / ${files.length}`}{" "}
              个文件
            </Badge>
            <Group>
              <Tooltip label="刷新">
                <ActionIcon
                  size="lg"
                  onClick={() => fetchFiles(filesPath)}
                  color="blue"
                >
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="上传文件">
                <ActionIcon
                  size="lg"
                  onClick={handleFileUpload}
                  color="green"
                  disabled={uploading}
                >
                  <IconPlus size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="上传文件夹">
                <ActionIcon
                  size="lg"
                  onClick={handleFolderUpload}
                  color="yellow"
                  disabled={uploading}
                >
                  <IconFolderPlus size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          {/* 搜索结果为空时的提示 */}
          {searchQuery && filteredFiles.length === 0 ? (
            <Stack align="center" justify="center" h={200}>
              <Text size="lg" c="dimmed">
                未找到文件
              </Text>
              <Text size="sm" c="dimmed">
                尝试用其他关键词搜索
              </Text>
            </Stack>
          ) : (
            <>
              <Card radius="md" withBorder>
                <Group
                  style={{
                    cursor: filesPath ? "pointer" : "auto",
                  }}
                  onClick={filesPath ? handleGoBack : undefined}
                >
                  <Text fw={500}>📁 {filesPath ? ".." : "根目录"}</Text>
                </Group>
              </Card>

              <Grid gutter="md">
                {displayedFiles.map((item, index) => (
                  <Grid.Col
                    key={index}
                    span={{ base: 12, xs: 6, sm: 4, md: 3, lg: 3, xl: 2 }}
                  >
                    <Card radius="md" withBorder>
                      <Group justify="space-between" wrap="nowrap" gap={4}>
                        <Stack
                          gap={4}
                          flex={1}
                          style={{
                            cursor:
                              item.type === "directory" ? "pointer" : "default",
                          }}
                          onClick={() => {
                            if (item.type === "directory") {
                              handleFolderClick(item.name);
                            }
                          }}
                        >
                          <Text fw={500} lineClamp={1}>
                            {item.type === "directory" ? "📁" : "📄"}{" "}
                            {item.name}
                          </Text>
                        </Stack>
                        <Menu shadow="md" width={120}>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                              <IconDotsVertical size={14} />
                            </ActionIcon>
                          </Menu.Target>

                          <Menu.Dropdown>
                            <Menu.Item
                              leftSection={<span>📖</span>}
                              onClick={() => {
                                if (item.type === "directory") {
                                  handleFolderClick(item.name);
                                } else {
                                  handleOpenFile(item);
                                }
                              }}
                            >
                              {item.type === "directory" ? "打开" : "查看"}
                            </Menu.Item>

                            <Menu.Item
                              leftSection={<span>📤</span>}
                              onClick={() => {
                                handleShareFile(item);
                              }}
                            >
                              分享
                            </Menu.Item>

                            <Menu.Divider />

                            <Menu.Item
                              leftSection={<span>⬇️</span>}
                              component={Link}
                              target="_blank"
                              href={formatDownload(item)}
                            >
                              下载
                            </Menu.Item>

                            <Menu.Item
                              disabled={
                                item.type === "directory" &&
                                item.name === ".note"
                              }
                              leftSection={<span>🗑️</span>}
                              onClick={() => {
                                handleDeleteFile(item);
                              }}
                            >
                              删除
                            </Menu.Item>

                            {item.size > 0 && (
                              <Menu.Label>
                                <Center>
                                  <Text size="xs" c="dimmed">
                                    {formatFileSize(item.size)}
                                  </Text>
                                </Center>
                              </Menu.Label>
                            )}
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>

              {hasMore && (
                <Center>
                  <Button variant="light" onClick={loadMore} size="md">
                    继续加载 ({filteredFiles.length - displayCount} 个剩余)
                  </Button>
                </Center>
              )}
            </>
          )}
        </Stack>
      ) : (
        <Stack align="center" justify="center" h={200}>
          <Text size="lg" c="dimmed">
            {loading ? "正在加载" : "暂无文件"}
          </Text>
          <Group>
            <Tooltip label="刷新">
              <ActionIcon
                size="lg"
                onClick={() => fetchFiles(filesPath)}
                color="blue"
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="上传文件">
              <ActionIcon
                size="lg"
                onClick={handleFileUpload}
                color="green"
                disabled={uploading}
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="上传文件夹">
              <ActionIcon
                size="lg"
                onClick={handleFolderUpload}
                color="yellow"
                disabled={uploading}
              >
                <IconFolderPlus size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Stack>
      )}

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
                <Card key={index} p="sm" withBorder>
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
                </Card>
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
    </>
  );
}
