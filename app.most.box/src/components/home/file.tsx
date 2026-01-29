"use client";
import { useEffect, useState, useRef, useMemo } from "react";
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
import "./file.scss";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconFolderPlus,
  IconX,
  IconRefresh,
  IconDotsVertical,
  IconPlus,
  IconFileImport,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import mp from "@/utils/mp";
import { FileItem, useUserStore } from "@/stores/userStore";
import { mostMnemonic } from "@/utils/MostWallet";
import { Wallet } from "ethers";
import {
  createCrustAuthHeader,
  uploadToIpfsGateway,
  pinToCrustGateway,
} from "@/utils/crust";

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

  const dotCID = useUserStore((state) => state.dotCID);

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importCID, setImportCID] = useState("");
  const [importName, setImportName] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const router = useRouter();
  const [showLargeFileModal, setShowLargeFileModal] = useState(false);
  const [largeFiles, setLargeFiles] = useState<File[]>([]);

  const fetchFiles = async (path: string) => {
    // 纯本地应用，不需要从后端获取
    setSearchQuery("");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatFilePath = (file: File) => {
    const rel = (file.webkitRelativePath || "").replace(/\\/g, "/");
    const dir = rel ? rel.split("/").slice(0, -1).join("/") : "";
    const parts: string[] = [];
    if (filesPath) parts.push(filesPath);
    if (dir) parts.push(dir);
    parts.push(file.name);
    return parts.join("/");
  };

  // 过滤文件列表
  const currentPath = mp.normalizePath(filesPath);
  const filteredFiles = useMemo(() => {
    if (!files) return [];

    if (searchQuery) {
      return files
        .filter((file) => mp.pinyin(file.name, searchQuery, 0))
        .sort((a, b) => {
          if (a.type === "directory" && b.type !== "directory") return -1;
          if (a.type !== "directory" && b.type === "directory") return 1;
          return 0;
        });
    }

    // 1. 获取直接在该路径下的文件
    const directFiles = files.filter(
      (file) => file.path === currentPath && file.type === "file",
    );

    // 2. 获取该路径下的所有子目录（推导出的虚拟目录）
    const inferredDirs = new Map<string, FileItem>();

    files.forEach((file) => {
      const fPath = file.path;

      // 如果是文件且在更深层的目录中，推导出当前层级的目录
      if (file.type === "file") {
        if (currentPath === "") {
          if (fPath !== "") {
            const firstSegment = fPath.split("/")[0];
            if (!inferredDirs.has(firstSegment)) {
              inferredDirs.set(firstSegment, {
                name: firstSegment,
                type: "directory",
                path: "",
                cid: { "/": `virtual-dir-${firstSegment}` },
                size: 0,
                createdAt: file.createdAt,
              });
            }
          }
        } else if (fPath.startsWith(currentPath + "/")) {
          const relativePath = fPath.slice(currentPath.length + 1);
          const firstSegment = relativePath.split("/")[0];
          if (!inferredDirs.has(firstSegment)) {
            inferredDirs.set(firstSegment, {
              name: firstSegment,
              type: "directory",
              path: currentPath,
              cid: { "/": `virtual-dir-${firstSegment}` },
              size: 0,
              createdAt: file.createdAt,
            });
          }
        }
      }
    });

    return [...Array.from(inferredDirs.values()), ...directFiles].sort(
      (a, b) => {
        if (a.type === "directory" && b.type !== "directory") return -1;
        if (a.type !== "directory" && b.type === "directory") return 1;
        return b.createdAt - a.createdAt;
      },
    );
  }, [files, currentPath, searchQuery]);

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
    if (!wallet) {
      notifications.show({ message: "请先连接钱包", color: "red" });
      return;
    }

    setUploadLoading(true);
    const notificationId = notifications.show({
      title: "上传中",
      message: "正在准备上传...",
      color: "blue",
      autoClose: false,
    });

    try {
      // 1. 生成 Auth Header (一次生成，批量使用)
      const mnemonic = mostMnemonic(wallet.danger);
      const account = Wallet.fromPhrase(mnemonic);
      const signature = await account.signMessage(account.address);
      const authHeader = createCrustAuthHeader(account.address, signature);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 更新进度通知
        notifications.update({
          id: notificationId,
          title: "上传中",
          message: `正在上传 ${file.name} (${i + 1}/${files.length})...`,
          autoClose: false,
        });

        // 2. 上传到 Crust/IPFS
        const ipfs = await uploadToIpfsGateway(file, authHeader);
        const crust = await pinToCrustGateway(ipfs.cid, file.name, authHeader);

        // 3. 注册到本地
        const targetPath = formatFilePath(file);
        const directoryPath =
          targetPath.split("/").slice(0, -1).join("/") || "/";

        useUserStore.getState().addLocalFile({
          cid: { "/": ipfs.cid },
          name: file.name,
          size: file.size,
          type: "file",
          txHash: crust?.data?.requestid || "",
          path: directoryPath,
        });

        notifications.update({
          id: notificationId,
          title: "上传中",
          message: `${file.name} 上传成功`,
          autoClose: false,
        });
      }

      notifications.update({
        id: notificationId,
        title: "上传完成",
        message: `共上传 ${files.length} 个文件`,
        color: "green",
        autoClose: true,
      });

      // TODO: 上传完成后刷新文件列表
      // await fetchFiles(filesPath);
      setShowPreview(false);
      setPreviewFiles([]);
    } catch (error: any) {
      console.error("上传失败:", error);
      let message =
        error?.response?.data || error?.message || "文件上传失败，请重试";

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

  const normalizeCIDInput = (s: string) => {
    const m = (s || "").match(
      /(baf[a-z0-9]{30,}|Qm[1-9A-HJ-NP-Za-km-z]{44,})/i,
    );
    if (m) return m[1];
    let input = (s || "").trim();
    input = input.replace(/^ipfs:\/\//i, "");
    input = input.replace(/^https?:\/\/[^/]+\/ipfs\//i, "");
    input = input.replace(/^\/?ipfs\//i, "");
    input = input.replace(/^\/+/, "");
    input = input.replace(/\?.*$/, "");
    input = input.replace(/#.*/, "");
    input = input.replace(/\/.*/, "");
    return input;
  };

  const extractFilename = (s: string) => {
    const m = (s || "").match(/[?&]filename=([^&#]+)/i);
    return m ? decodeURIComponent(m[1]) : "";
  };

  const executeImport = async () => {
    const cid = normalizeCIDInput(importCID);
    if (!cid) {
      notifications.show({
        title: "提示",
        message: "请输入有效的 CID",
        color: "red",
      });
      return;
    }
    try {
      setImportLoading(true);
      const name = (importName || cid).trim();
      const directoryPath = filesPath || "/";

      useUserStore.getState().addLocalFile({
        cid: { "/": cid },
        name: name,
        size: 0,
        type: "file",
        path: directoryPath,
      });

      notifications.show({
        message: `已导入 CID: ${cid}${importName ? `「${importName}」` : ""}`,
        color: "green",
      });
      setImportModalOpen(false);
      setImportCID("");
      setImportName("");
    } catch (error: any) {
      const msg = error?.response?.data || "导入失败，请重试";
      notifications.show({ title: "错误", message: msg, color: "red" });
    } finally {
      setImportLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);

      // Check for files larger than 200MB
      const MAX_SIZE = 200 * 1024 * 1024; // 200MB
      const oversizedFiles = fileArray.filter((file) => file.size > MAX_SIZE);

      if (oversizedFiles.length > 0) {
        setLargeFiles(oversizedFiles);
        setShowLargeFileModal(true);
        // Clear input to allow re-selecting
        event.target.value = "";
        return;
      }

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
      0,
    );
    return formatFileSize(totalBytes);
  };

  // 删除文件函数
  const deleteFile = async (item: FileItem) => {
    try {
      if (item.type === "directory") {
        // 如果是目录，删除该目录下所有文件
        const fullPath =
          currentPath === "" ? item.name : `${currentPath}/${item.name}`;

        const filesToDelete = files.filter((file) => {
          const fFullPath =
            file.path === "" ? file.name : `${file.path}/${file.name}`;
          return fFullPath === fullPath || fFullPath.startsWith(fullPath + "/");
        });

        filesToDelete.forEach((file) => {
          useUserStore.getState().deleteLocalFile(file.cid["/"]);
        });
      } else {
        useUserStore.getState().deleteLocalFile(item.cid["/"]);
      }

      notifications.show({
        title: "删除成功",
        message: `${item.type === "directory" ? "目录" : "文件"} ${item.name} 已删除`,
        color: "green",
      });
    } catch (error) {
      console.error("删除失败:", error);
      notifications.show({
        title: "删除失败",
        message: `删除${item.type === "directory" ? "目录" : "文件"} ${
          item.name
        } 失败，请重试`,
        color: "red",
      });
    }
  };

  // 确认删除的函数
  const handleDeleteFile = (item: FileItem) => {
    const confirmed = window.confirm(`确定要删除文件 "${item.name}" 吗？`);
    if (confirmed) {
      deleteFile(item);
    }
  };

  // 重命名文件函数
  const handleRename = (item: FileItem) => {
    setRenamingItem(item);
    setNewName(item.name);
    setNewDirPath(item.path || "");
    setRenameModalOpen(true);
  };

  // 执行重命名
  const executeRename = async () => {
    if (!renamingItem || !newName.trim()) {
      setRenameModalOpen(false);
      return;
    }

    const oldFullPath =
      currentPath === ""
        ? renamingItem.name
        : `${currentPath}/${renamingItem.name}`;

    const targetDir = mp.normalizePath(newDirPath || "");
    const newFullPath = targetDir
      ? `${targetDir}/${newName.trim()}`
      : newName.trim();

    const unchanged = oldFullPath === newFullPath;
    if (unchanged) {
      setRenameModalOpen(false);
      return;
    }

    setRenameLoading(true);
    try {
      useUserStore
        .getState()
        .renameLocalFile(oldFullPath, targetDir, newName.trim());

      notifications.show({
        title: "操作成功",
        message: `新路径名称 "${mp.normalizePath(newFullPath)}"`,
        color: "green",
      });

      setRenameModalOpen(false);
      setRenamingItem(null);
      setNewName("");
      setNewDirPath("");
    } catch (error) {
      console.error("操作失败:", error);
      notifications.show({
        title: "操作失败",
        message: `重命名/移动文件 "${renamingItem.name}" 失败，请重试`,
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

  const oldPathForCompare = renamingItem
    ? currentPath
      ? `${currentPath}/${renamingItem.name}`
      : renamingItem.name
    : "";
  const newPathForCompare = mp.normalizePath(
    ((newDirPath ? `${newDirPath}/` : "") + newName).trim(),
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
            <Tooltip label="从 CID 导入">
              <ActionIcon
                size="lg"
                onClick={() => setImportModalOpen(true)}
                color="violet"
                disabled={!wallet || importLoading}
              >
                <IconFileImport size={18} />
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
                          {/* <Menu.Item
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
                          </Menu.Item> */}

                          <Menu.Item
                            leftSection="📖"
                            onClick={() => {
                              handleShareFile(item);
                            }}
                          >
                            查看
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

      {/* 从 IPFS 导入模态框 */}
      <Modal
        opened={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportCID("");
          setImportName("");
        }}
        title="从 IPFS 路径导入"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="CID"
            required
            placeholder="/ipfs/xxxx 或 CID"
            value={importCID}
            onChange={(event) => {
              const v = event.currentTarget.value;
              setImportCID(v);
              const fn = extractFilename(v);
              if (fn) setImportName(fn);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                executeImport();
              }
            }}
            disabled={importLoading}
            autoFocus
          />
          <TextInput
            label="文件名"
            value={importName}
            onChange={(event) => setImportName(event.currentTarget.value)}
            disabled={importLoading}
          />

          <Group justify="flex-end" gap="sm">
            <Button
              variant="outline"
              onClick={() => {
                setImportModalOpen(false);
                setImportCID("");
                setImportName("");
              }}
              disabled={importLoading}
            >
              取消
            </Button>
            <Button
              onClick={executeImport}
              loading={importLoading}
              disabled={!wallet || !importCID.trim()}
            >
              导入
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
            placeholder="根目录留空，例如: image/like"
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

      {/* 大文件提示模态框 */}
      <Modal
        opened={showLargeFileModal}
        onClose={() => setShowLargeFileModal(false)}
        title="大文件上传"
        centered
      >
        <Stack gap="md">
          <Text color="dimmed">
            以下文件超过 200MB 请前往大文件专用通道进行上传。
          </Text>
          <ScrollArea.Autosize mah={200}>
            <Stack gap="xs">
              {largeFiles.map((file, index) => (
                <Group key={index}>
                  <Text size="sm">{file.name}</Text>
                  <Text size="sm" c="dimmed">
                    {formatFileSize(file.size)}
                  </Text>
                </Group>
              ))}
            </Stack>
          </ScrollArea.Autosize>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => setShowLargeFileModal(false)}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                setShowLargeFileModal(false);
                router.push("/upload");
              }}
              color="blue"
            >
              前往大文件上传
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
