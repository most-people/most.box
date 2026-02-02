"use client";
import { useState, useRef } from "react";
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
  IconUpload,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
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

import { useFileExplorer } from "@/hooks/useFileExplorer";

export default function HomeFile() {
  const wallet = useUserStore((state) => state.wallet);
  const setItem = useUserStore((state) => state.setItem);
  const dotCID = useUserStore((state) => state.dotCID);

  const {
    currentPath,
    searchQuery,
    setSearchQuery,
    filteredItems,
    displayedItems,
    hasMore,
    loadMore,
    handleFolderClick,
    handleBreadcrumbClick,
  } = useFileExplorer("files");

  const filesFromStore = useUserStore((state) => state.files);
  const files = Array.isArray(filesFromStore) ? filesFromStore : [];
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const [showPreview, setShowPreview] = useState(false);
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
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderLoading, setNewFolderLoading] = useState(false);
  const router = useRouter();
  const [showLargeFileModal, setShowLargeFileModal] = useState(false);
  const [largeFiles, setLargeFiles] = useState<File[]>([]);

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
        const targetPath = mp.formatFilePath(file, currentPath);
        const directoryPath =
          targetPath.split("/").slice(0, -1).join("/") || "/";

        useUserStore.getState().addFile({
          cid: ipfs.cid,
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

      setShowPreview(false);
      setPreviewFiles([]);
    } catch (error: unknown) {
      console.error("上传失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "文件上传失败，请重试";
      let message = errorMessage;

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

  const createFolder = async () => {
    if (!newFolderName) {
      notifications.show({
        title: "提示",
        message: "文件夹名称不能为空",
        color: "red",
      });
      return;
    }
    const folderExists = filteredItems.some(
      (file) => file.type === "directory" && file.name === newFolderName,
    );
    if (folderExists) {
      notifications.show({
        title: "提示",
        message: "文件夹已存在",
        color: "red",
      });
      return;
    }

    if (!wallet) {
      notifications.show({ message: "请先连接钱包", color: "red" });
      return;
    }

    try {
      setNewFolderLoading(true);

      const targetPath = currentPath
        ? `${currentPath}/${newFolderName}`
        : newFolderName;

      useUserStore.getState().addFile({
        name: "index.txt",
        size: 8, // "Most.Box" 的大小
        type: "file",
        path: targetPath,
      });

      notifications.show({
        message: "文件夹创建成功",
        color: "green",
      });
      setNewFolderModalOpen(false);
      setNewFolderName("");
    } catch (error: unknown) {
      console.error("创建文件夹失败:", error);
      const message = error instanceof Error ? error.message : "创建文件夹失败";
      notifications.show({
        message,
        color: "red",
      });
    } finally {
      setNewFolderLoading(false);
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
      const directoryPath = currentPath || "/";

      useUserStore.getState().addFile({
        cid: cid,
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "导入失败，请重试";
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
          size: mp.formatFileSize(file.size),
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
    return mp.formatFileSize(totalBytes);
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
          useUserStore.getState().deleteFile(file.cid, file.path, file.name);
        });
      } else {
        useUserStore.getState().deleteFile(item.cid, item.path, item.name);
      }

      notifications.show({
        title: "提示",
        message: `${item.type === "directory" ? "文件夹" : "文件"} ${item.name} 已删除`,
        color: "green",
      });
    } catch (error) {
      console.error("删除失败:", error);
      notifications.show({
        title: "提示",
        message: `删除${item.type === "directory" ? "文件夹" : "文件"} ${
          item.name
        } 失败，请重试`,
        color: "red",
      });
    }
  };

  // 确认删除的函数
  const handleDeleteFile = (item: FileItem) => {
    const isDir = item.type === "directory";
    modals.openConfirmModal({
      title: "提示",
      children: (
        <Text size="sm">
          确定要删除{isDir ? "文件夹" : "文件"} &quot;{item.name}
          &quot; 吗？此操作不可撤销。
        </Text>
      ),
      labels: { confirm: "确定", cancel: "取消" },
      confirmProps: { color: "red" },
      onConfirm: () => deleteFile(item),
    });
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

    try {
      setRenameLoading(true);
      useUserStore
        .getState()
        .renameFile(oldFullPath, targetDir, newName.trim());

      notifications.show({
        title: "操作成功",
        message: `新路径名称 "${mp.normalizePath(newFullPath)}"`,
        color: "green",
      });

      setRenameModalOpen(false);
      setRenamingItem(null);
      setNewName("");
      setNewDirPath("");
    } catch (error: unknown) {
      console.error("操作失败:", error);
      const message =
        error instanceof Error ? error.message : "重命名/移动文件失败";
      notifications.show({
        title: "操作失败",
        message: `${message}，请重试`,
        color: "red",
      });
    } finally {
      setRenameLoading(false);
    }
  };

  // 分享文件
  const handleShareFile = (item: FileItem) => {
    const cid = item.cid;
    if (!cid) return;
    const params = new URLSearchParams({ filename: item.name });
    if (item.type === "directory") {
      params.set("type", "dir");
    }
    const url = `/ipfs/${cid}/?${params.toString()}`;
    window.open(url);
  };

  // 下载文件
  const formatDownload = (item: FileItem) => {
    if (!item.cid) return "#";
    const params = new URLSearchParams({
      download: "true",
      filename: item.name,
    });
    // 文件夹压缩为 tar 下载
    if (item.type === "directory") {
      params.set("format", "tar");
      params.set("filename", `${item.name}.tar`);
    }
    return `${dotCID || "https://gw.crustfiles.app"}/ipfs/${item.cid}?${params.toString()}`;
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
          <Badge variant="light" size="lg">
            {searchQuery
              ? `显示 ${displayedItems.length} / ${
                  filteredItems.length
                } (总共 ${files?.length || 0})`
              : `显示 ${displayedItems.length} / ${files?.length || 0}`}{" "}
            个文件
          </Badge>
          <Group>
            <Tooltip label="刷新">
              <ActionIcon
                size="lg"
                onClick={() => setItem("filesPath", currentPath)}
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
            <Tooltip label="新建文件夹">
              <ActionIcon
                size="lg"
                onClick={() => setNewFolderModalOpen(true)}
                color="yellow"
                disabled={!wallet || uploadLoading}
              >
                <IconFolderPlus size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="上传文件夹">
              <ActionIcon
                size="lg"
                onClick={handleFolderUpload}
                color="orange"
                disabled={!wallet || uploadLoading}
              >
                <IconUpload size={18} />
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
        {searchQuery && filteredItems.length === 0 ? (
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
                      文件
                    </Anchor>
                    {(currentPath || "")
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
              {displayedItems.map((item) => (
                <Grid.Col
                  key={(item.cid || "") + item.path + item.name}
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
                              handleShareFile(item);
                            }}
                            disabled={!item.cid}
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
                            disabled={!item.cid || formatDownload(item) === "#"}
                          >
                            下载
                          </Menu.Item>

                          <Menu.Item
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
                                  {mp.formatFileSize(item.size)}
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
                  继续加载 ({filteredItems.length - displayedItems.length}{" "}
                  个剩余)
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

      {/* 新建文件夹模态框 */}
      <Modal
        opened={newFolderModalOpen}
        onClose={() => {
          setNewFolderModalOpen(false);
          setNewFolderName("");
        }}
        title="新建文件夹"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="文件夹名称"
            required
            placeholder="请输入文件夹名称"
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
              variant="outline"
              onClick={() => {
                setNewFolderModalOpen(false);
                setNewFolderName("");
              }}
              disabled={newFolderLoading}
            >
              取消
            </Button>
            <Button
              onClick={createFolder}
              loading={newFolderLoading}
              disabled={!newFolderName.trim()}
            >
              创建
            </Button>
          </Group>
        </Stack>
      </Modal>

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
          <Text c="dimmed">
            以下文件超过 200MB 请前往大文件专用通道进行上传。
          </Text>
          <ScrollArea.Autosize mah={200}>
            <Stack gap="xs">
              {largeFiles.map((file, index) => (
                <Group key={index}>
                  <Text size="sm">{file.name}</Text>
                  <Text size="sm" c="dimmed">
                    {mp.formatFileSize(file.size)}
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
