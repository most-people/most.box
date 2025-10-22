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
  LoadingOverlay,
  Breadcrumbs,
  Anchor,
} from "@mantine/core";
import { api } from "@/constants/api";
import "./file.scss";
import Link from "next/link";
import {
  IconFolderPlus,
  IconX,
  IconRefresh,
  IconDotsVertical,
  IconPlus,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import mp from "@/constants/mp";
import { FileItem, useUserStore } from "@/stores/userStore";
import { useDotStore } from "@/stores/dotStore";

interface PreviewFile {
  file: File;
  path: string;
  size: string;
}

const SystemDir = [".note"];

export default function HomeFile() {
  const wallet = useUserStore((state) => state.wallet);
  const files = useUserStore((state) => state.files);
  const filesPath = useUserStore((state) => state.filesPath);
  const setItem = useUserStore((state) => state.setItem);
  const rootCID = useUserStore((state) => state.rootCID);
  const setRootCID = useUserStore((state) => state.setRootCID);

  const dotCID = useDotStore((state) => state.dotCID);

  const [fetchLoading, setFetchLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(100);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renamingItem, setRenamingItem] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState("");
  const [newDirPath, setNewDirPath] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderLoading, setNewFolderLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async (path: string) => {
    try {
      setFetchLoading(true);
      const res = await api.post(`/files/${path}`);
      setSearchQuery("");
      setItem("files", res.data);
    } catch (error) {
      console.info(error);
      // notifications.show({ message: (error as Error).message, color: "red" });
    } finally {
      setFetchLoading(false);
    }

    // 获取 MFS 根目录 CID
    if (path === "") {
      api.post("/files.cid").then((res) => {
        const cid = res.data;
        if (cid) {
          setItem("rootCID", cid);
        }
      });
    }
  };

  const createFolder = async () => {
    if (!newFolderName) {
      notifications.show({
        title: "提示",
        message: "文件夹名称不能为空",
        color: "red",
      });
      return;
    }

    const folderExists = files?.some(
      (file) => file.type === "directory" && file.name === newFolderName
    );

    if (folderExists) {
      notifications.show({
        title: "提示",
        message: "文件夹已存在",
        color: "red",
      });
      return;
    }

    try {
      setNewFolderLoading(true);
      const path = filesPath ? `${filesPath}/${newFolderName}` : newFolderName;
      const emptyFile = new Blob(["Most.Box"], { type: "text/plain" });
      const formData = new FormData();
      formData.append("file", emptyFile, "hello.txt");
      formData.append("path", `${path}/hello.txt`);
      const res = await api.put("/files.upload", formData);
      const cid = res.data?.cid;
      if (cid) {
        setRootCID();
        notifications.show({
          message: "文件夹创建成功",
          color: "green",
        });
        await fetchFiles(filesPath);
        setNewFolderModalOpen(false);
        setNewFolderName("");
      } else {
        throw new Error("文件夹创建失败");
      }
    } catch (error) {
      console.info(error);
      notifications.show({
        message: (error as Error).message,
        color: "red",
      });
    } finally {
      setNewFolderLoading(false);
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

    setUploadLoading(true);
    const notificationId = notifications.show({
      title: "上传中",
      message: "请稍后...",
      color: "blue",
      autoClose: false,
    });

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
          setRootCID();
          notifications.update({
            id: notificationId,
            title: "上传中",
            message: `${file.name} 上传成功`,
          });
        }
      }

      notifications.update({
        id: notificationId,
        title: "上传完成",
        message: `共上传 ${files.length} 个文件`,
        color: "green",
        autoClose: true,
      });

      // 上传完成后刷新文件列表
      await fetchFiles(filesPath);
      setShowPreview(false);
      setPreviewFiles([]);
    } catch (error: any) {
      let message = error?.response?.data || "文件上传失败，请重试";
      if (message.includes("already has")) {
        message = "文件已存在";
      }
      notifications.update({
        id: notificationId,
        title: "上传失败",
        message,
        color: "red",
        autoClose: true,
      });
    } finally {
      setUploadLoading(false);
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

  // 重命名文件函数
  const handleRename = (item: FileItem) => {
    setRenamingItem(item);
    setNewName(item.name);
    setNewDirPath(filesPath || "");
    setRenameModalOpen(true);
  };

  // 执行重命名
  const executeRename = async () => {
    const normalize = (s: string) => (s || "").replace(/^\/+|\/+$/g, "");
    if (!renamingItem || !newName.trim()) {
      setRenameModalOpen(false);
      return;
    }

    const oldPath = filesPath
      ? `${filesPath}/${renamingItem.name}`
      : renamingItem.name;

    const targetDir = normalize(newDirPath || "");
    const newPath = targetDir
      ? `${targetDir}/${newName.trim()}`
      : newName.trim();

    const unchanged = normalize(oldPath) === normalize(newPath);
    if (unchanged) {
      setRenameModalOpen(false);
      return;
    }

    setRenameLoading(true);
    try {
      await api.put("/files.rename", {
        oldName: `/${normalize(oldPath)}`,
        newName: `/${normalize(newPath)}`,
      });

      notifications.show({
        title: "重命名成功",
        message: `新路径名称 "${normalize(newPath)}"`,
        color: "green",
      });

      // 重命名成功后刷新文件列表
      await fetchFiles(filesPath);
      setRenameModalOpen(false);
      setRenamingItem(null);
      setNewName("");
      setNewDirPath("");
    } catch (error) {
      console.error("重命名失败:", error);
      notifications.show({
        title: "重命名失败",
        message: `重命名文件 "${renamingItem.name}" 失败，请重试`,
        color: "red",
      });
    } finally {
      setRenameLoading(false);
    }
  };

  // 处理文件夹点击
  const handleFolderClick = (folderName: string) => {
    const newPath = filesPath ? `${filesPath}/${folderName}` : folderName;
    setItem("filesPath", newPath);
    fetchFiles(newPath);
  };

  // 面包屑点击跳转
  const handleBreadcrumbClick = (index: number) => {
    const parts = (filesPath || "").split("/").filter(Boolean);
    if (index < 0) {
      setItem("filesPath", "");
      fetchFiles("");
      return;
    }
    const newPath = parts.slice(0, index + 1).join("/");
    setItem("filesPath", newPath);
    fetchFiles(newPath);
  };

  // 打开文件
  const handleOpenFile = (item: FileItem) => {
    try {
      const url = new URL(dotCID);
      url.pathname = `/ipfs/${item.cid["/"]}`;
      if (item.name) {
        url.searchParams.set("filename", item.name);
      }
      window.open(url.toString(), "_blank");
    } catch (error) {
      console.error("打开失败", error);
    }
  };

  // 分享文件
  const handleShareFile = (item: FileItem) => {
    const cid = item.cid["/"];
    const params = new URLSearchParams({ filename: item.name });
    if (item.type === "directory") {
      params.set("type", "dir");
    }
    const url = `/ipfs/${cid}/?${params.toString()}`;
    window.open(url);
  };

  // 下载文件
  const formatDownload = (item: FileItem) => {
    const params = new URLSearchParams({
      download: "true",
      filename: item.name,
    });
    // 文件夹压缩为 tar 下载
    if (item.type === "directory") {
      params.set("format", "tar");
      params.set("filename", `${item.name}.tar`);
    }
    return `${dotCID}/ipfs/${item.cid["/"]}?${params.toString()}`;
  };

  useEffect(() => {
    if (rootCID && wallet && !files) {
      fetchFiles(filesPath);
    }
  }, [rootCID, wallet, files]);

  const normalizePath = (s: string) => (s || "").replace(/^\/+|\/+$/g, "");
  const oldPathForCompare = renamingItem
    ? normalizePath(
        filesPath ? `${filesPath}/${renamingItem.name}` : renamingItem.name
      )
    : "";
  const newPathForCompare = normalizePath(
    ((newDirPath ? `${newDirPath}/` : "") + newName).trim()
  );
  const isUnchangedRename = oldPathForCompare === newPathForCompare;

  return (
    <>
      <Stack gap="md" p="md">
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

        <Group justify="space-between" align="center" pos="relative">
          <LoadingOverlay
            visible={fetchLoading}
            overlayProps={{ backgroundOpacity: 0 }}
            loaderProps={{ type: "dots" }}
          />
          <Badge variant="light" size="lg">
            {searchQuery
              ? `显示 ${displayedFiles.length} / ${
                  filteredFiles.length
                } (总共 ${files?.length || 0})`
              : `显示 ${displayedFiles.length} / ${files?.length || 0}`}{" "}
            个文件
          </Badge>
          <Group>
            <Tooltip label="刷新">
              <ActionIcon
                size="lg"
                onClick={() => fetchFiles(filesPath)}
                color="blue"
                disabled={!wallet}
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="上传文件">
              <ActionIcon
                size="lg"
                onClick={handleFileUpload}
                color="green"
                disabled={!wallet || uploadLoading}
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="上传文件夹">
              <ActionIcon
                size="lg"
                onClick={handleFolderUpload}
                color="yellow"
                disabled={!wallet || uploadLoading}
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
              <Group justify="space-between" wrap="nowrap" gap={4}>
                <Group gap={8} wrap="nowrap">
                  <Text fw={500}>📁</Text>
                  <Breadcrumbs separator="›">
                    <Anchor
                      fw={500}
                      onClick={() => handleBreadcrumbClick(-1)}
                      underline="never"
                    >
                      根目录
                    </Anchor>
                    {(filesPath || "")
                      .split("/")
                      .filter(Boolean)
                      .map((seg, idx) => (
                        <Anchor
                          key={idx}
                          fw={500}
                          onClick={() => handleBreadcrumbClick(idx)}
                          underline="never"
                        >
                          {seg}
                        </Anchor>
                      ))}
                  </Breadcrumbs>
                </Group>
                <Menu shadow="md">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray">
                      <IconDotsVertical size={14} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      onClick={() => setNewFolderModalOpen(true)}
                      leftSection="📁"
                      disabled={!wallet}
                    >
                      新建文件夹
                    </Menu.Item>
                    <Menu.Item
                      onClick={() =>
                        handleOpenFile({
                          name: "root",
                          type: "directory",
                          cid: { "/": rootCID },
                          size: 0,
                        })
                      }
                      leftSection="🌐"
                      disabled={!wallet}
                    >
                      根目录 CID
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Card>

            <Grid gutter="md" pos="relative">
              <LoadingOverlay
                visible={fetchLoading}
                overlayProps={{ backgroundOpacity: 0 }}
                loaderProps={{ opacity: 0 }}
              />
              {displayedFiles.map((item, index) => (
                <Grid.Col
                  key={index}
                  span={{ base: 12, xs: 6, sm: 4, md: 3, lg: 3, xl: 2 }}
                >
                  <Card radius="md" withBorder>
                    <Group justify="space-between" wrap="nowrap" gap={4}>
                      <Stack
                        flex={1}
                        style={{
                          cursor: item.type === "directory" ? "pointer" : "",
                        }}
                        onClick={() => {
                          if (item.type === "directory") {
                            handleFolderClick(item.name);
                          }
                        }}
                      >
                        <Text fw={500} lineClamp={1}>
                          {item.type === "directory" ? "📁" : "📄"} {item.name}
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
                            leftSection="📖"
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
                            leftSection="📤"
                            onClick={() => {
                              handleShareFile(item);
                            }}
                          >
                            分享
                          </Menu.Item>

                          <Menu.Item
                            leftSection="✏️"
                            onClick={() => handleRename(item)}
                          >
                            重命名
                          </Menu.Item>

                          <Menu.Divider />

                          <Menu.Item
                            leftSection="⬇️"
                            component={Link}
                            target="_blank"
                            href={formatDownload(item)}
                          >
                            下载
                          </Menu.Item>

                          <Menu.Item
                            disabled={
                              filesPath === "" &&
                              item.type === "directory" &&
                              SystemDir.includes(item.name)
                            }
                            leftSection="🗑️"
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

      {!wallet && (
        <Center>
          <Button variant="gradient" component={Link} href="/login">
            去登录
          </Button>
        </Center>
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
              disabled={uploadLoading}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmUpload}
              loading={uploadLoading}
              disabled={previewFiles.length === 0}
            >
              确认上传
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 重命名模态框 */}
      <Modal
        opened={newFolderModalOpen}
        onClose={() => setNewFolderModalOpen(false)}
        title="新建文件夹"
        centered
      >
        <Stack gap="md">
          <TextInput
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                createFolder();
              }
            }}
            disabled={newFolderLoading}
            autoFocus
          />
          <Group justify="flex-end" gap="sm">
            <Button
              onClick={() => setNewFolderModalOpen(false)}
              variant="default"
            >
              取消
            </Button>
            <Button onClick={createFolder} loading={newFolderLoading}>
              确认
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={renameModalOpen}
        onClose={() => {
          setRenameModalOpen(false);
          setRenamingItem(null);
          setNewName("");
          setNewDirPath("");
        }}
        title="重命名 / 移动"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="目录路径"
            placeholder="根目录留空，例如: foo/bar"
            value={newDirPath}
            onChange={(event) => setNewDirPath(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                executeRename();
              }
            }}
            disabled={renameLoading}
          />
          <TextInput
            label="文件/文件夹名称"
            placeholder="请输入新的名称"
            value={newName}
            onChange={(event) => setNewName(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                executeRename();
              }
            }}
            disabled={renameLoading}
            autoFocus
          />
          <Group justify="flex-end" gap="sm">
            <Button
              variant="outline"
              onClick={() => {
                setRenameModalOpen(false);
                setRenamingItem(null);
                setNewName("");
                setNewDirPath("");
              }}
              disabled={renameLoading}
            >
              取消
            </Button>
            <Button
              onClick={executeRename}
              disabled={!newName.trim() || isUnchangedRename || renameLoading}
              loading={renameLoading}
            >
              确认
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
