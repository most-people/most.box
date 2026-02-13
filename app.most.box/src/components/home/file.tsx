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
  IconDotsVertical,
  IconPlus,
  IconFolderUp,
  IconWorld,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import mp from "@/utils/mp";
import { FileItem, useUserStore } from "@/stores/userStore";
import { mostCrust } from "@/utils/MostWallet";
import crust from "@/utils/crust";
import { useFileExplorer } from "@/hooks/useExplorer";

// 预览文件接口定义
interface PreviewFile {
  file: File;
  path: string;
  size: string;
}

export default function HomeFile() {
  // 从 userStore 获取钱包信息和 dotCID
  const wallet = useUserStore((state) => state.wallet);
  const dotCID = useUserStore((state) => state.dotCID);

  // 使用文件浏览器钩子获取当前路径、搜索、筛选等状态和方法
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
  } = useFileExplorer();

  // 从 userStore 获取所有文件列表
  const files = useUserStore((state) => state.files);

  // 状态管理
  const [uploadLoading, setUploadLoading] = useState(false); // 上传加载状态
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]); // 预览文件列表
  const [showPreview, setShowPreview] = useState(false); // 是否显示预览模态框
  const [renameModalOpen, setRenameModalOpen] = useState(false); // 重命名模态框状态
  const [renamingItem, setRenamingItem] = useState<FileItem | null>(null); // 当前正在重命名的项目
  const [newName, setNewName] = useState(""); // 新名称
  const [newDirPath, setNewDirPath] = useState(""); // 新目录路径
  const [renameLoading, setRenameLoading] = useState(false); // 重命名加载状态

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null); // 文件输入框 Ref
  const folderInputRef = useRef<HTMLInputElement>(null); // 文件夹输入框 Ref

  // 新建文件夹相关状态
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderLoading, setNewFolderLoading] = useState(false);

  const router = useRouter();

  // 大文件相关状态
  const [showLargeFileModal, setShowLargeFileModal] = useState(false);
  const [largeFiles, setLargeFiles] = useState<File[]>([]);

  // 上传文件函数
  const uploadFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    if (!wallet) {
      notifications.show({ message: "请先登录", color: "red" });
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
      const { crust_address, sign } = mostCrust(wallet.danger);
      const signature = sign(crust_address);
      const authHeader = crust.auth(crust_address, signature);

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
        const ipfs = await crust.ipfs(file, authHeader);
        const pinResult = await crust.pin(ipfs.cid, file.name, authHeader);

        // 默认为 6 个月 (180天)
        let expiredAt = Date.now() + 180 * 24 * 60 * 60 * 1000;

        // 尝试获取链上过期时间 (如果是秒传，可以获取到真实过期时间)
        try {
          const status = await crust.getFileStatus(ipfs.cid);
          if (status && status.expiredAt) {
            expiredAt = status.expiredAt;
          }
        } catch (error: unknown) {
          console.warn("获取过期时间失败，使用默认值", error);
        }

        // 3. 注册到本地状态管理
        const targetPath = mp.formatFilePath(file, currentPath);
        const directoryPath =
          targetPath.split("/").slice(0, -1).join("/") || "/";

        useUserStore.getState().addFile({
          cid: ipfs.cid,
          name: file.name,
          size: file.size,
          type: "file",
          path: directoryPath,
          expired_at: expiredAt,
          tx_hash: pinResult?.data?.requestid || "",
        });

        notifications.update({
          id: notificationId,
          title: "上传中",
          message: `${file.name} 上传成功`,
          autoClose: false,
        });
      }

      // 上传完成通知
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

  // 创建文件夹函数
  const createFolder = async () => {
    if (!newFolderName) {
      notifications.show({
        title: "提示",
        message: "文件夹名称不能为空",
        color: "red",
      });
      return;
    }
    // 检查文件夹是否存在
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
      notifications.show({ message: "请先登录", color: "red" });
      return;
    }

    try {
      setNewFolderLoading(true);

      const targetPath = currentPath
        ? `${currentPath}/${newFolderName}`
        : newFolderName;

      // 添加文件夹到状态管理（实际上是创建一个占位文件）
      useUserStore.getState().addFile({
        name: "index.txt",
        cid: "bafybeidzwbgdh55qpw6zbrxbyk3hywy2fobqrjukeimb5axvfdpzvcfysq",
        size: 8,
        type: "file",
        path: targetPath,
        expired_at: 0,
        tx_hash: "",
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

  const websiteInputRef = useRef<HTMLInputElement>(null);

  // 触发网站上传输入框
  const handleWebsiteUpload = () => {
    websiteInputRef.current?.click();
  };

  // 处理网站文件选择变化
  const handleWebsiteChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!wallet) {
      notifications.show({ message: "请先登录", color: "red" });
      return;
    }

    setUploadLoading(true);
    const notificationId = notifications.show({
      title: "上传中",
      message: "正在打包上传网站...",
      color: "blue",
      autoClose: false,
    });

    try {
      const fileArray = Array.from(files);
      // 准备文件以上传到 IPFS 目录
      // 去除路径中的第一个目录，使内容在根级别
      const ipfsFiles = fileArray.map((file) => {
        const relPath = file.webkitRelativePath || file.name;
        const parts = relPath.split("/");
        const path = parts.length > 1 ? parts.slice(1).join("/") : relPath;
        return {
          path,
          content: file,
        };
      });

      // 认证
      const { crust_address, sign } = mostCrust(wallet.danger);
      const signature = sign(crust_address);
      const authHeader = crust.auth(crust_address, signature);

      // 上传目录
      const result = await crust.ipfsDir(ipfsFiles, authHeader);
      // Pin 操作
      const folderName =
        fileArray[0]?.webkitRelativePath?.split("/")[0] || "Website";
      await crust.pin(result.cid, folderName, authHeader);

      // Pin 所有子文件
      if (result.allFiles) {
        const subFiles = result.allFiles
          .filter((file) => file.cid !== result.cid)
          .map((file) => ({
            cid: file.cid,
            name: file.path || file.cid,
          }));

        // 批量 Pin 所有子文件
        await crust.pinBatch(subFiles, authHeader);
      }

      // 计算总大小（包括所有子文件）
      const totalSize = fileArray.reduce((acc, file) => acc + file.size, 0);

      // 获取过期时间
      let expiredAt = Date.now() + 180 * 24 * 60 * 60 * 1000;
      try {
        const status = await crust.getFileStatus(result.cid);
        if (status && status.expiredAt) {
          expiredAt = status.expiredAt;
        }
      } catch (error) {
        console.warn("获取过期时间失败，使用默认值", error);
      }

      // 添加到本地状态
      useUserStore.getState().addFile({
        cid: result.cid,
        name: folderName,
        size: totalSize,
        type: "directory", // 明确标记为带有 CID 的目录
        path: currentPath,
        expired_at: expiredAt,
        tx_hash: "",
      });

      notifications.update({
        id: notificationId,
        title: "上传成功",
        message: `网站 ${folderName} 已上传`,
        color: "green",
        autoClose: true,
      });
    } catch (error: unknown) {
      console.error("网站上传失败:", error);
      const message =
        error instanceof Error ? error.message : "网站上传失败，请重试";
      notifications.update({
        id: notificationId,
        title: "上传失败",
        message,
        color: "red",
        autoClose: true,
      });
    } finally {
      setUploadLoading(false);
      // 清空输入框
      event.target.value = "";
    }
  };

  // 触发文件上传输入框
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  // 触发文件夹上传输入框
  const handleFolderUpload = () => {
    folderInputRef.current?.click();
  };

  // 处理文件选择变化
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);

      // 检查是否有超过 200MB 的大文件
      const MAX_SIZE = 200 * 1024 * 1024; // 200MB
      const oversizedFiles = fileArray.filter((file) => file.size > MAX_SIZE);

      if (oversizedFiles.length > 0) {
        setLargeFiles(oversizedFiles);
        setShowLargeFileModal(true);
        // 清空输入框以便重新选择
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

  // 确认上传
  const handleConfirmUpload = () => {
    const files = previewFiles.map((item) => item.file);
    uploadFiles(files);
  };

  // 取消上传
  const handleCancelUpload = () => {
    setShowPreview(false);
    setPreviewFiles([]);
  };

  // 移除预览文件
  const removePreviewFile = (index: number) => {
    const newPreviewFiles = previewFiles.filter((_, i) => i !== index);
    setPreviewFiles(newPreviewFiles);
    if (newPreviewFiles.length === 0) {
      setShowPreview(false);
    }
  };

  // 获取总大小
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
        autoClose: true,
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
      centered: true,
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
        autoClose: true,
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
        autoClose: true,
      });
    } finally {
      setRenameLoading(false);
    }
  };

  // 分享文件
  const handleOpenFile = (item: FileItem) => {
    const params = new URLSearchParams({ cid: item.cid, filename: item.name });
    if (item.type === "directory") {
      if (item.cid) {
        params.set("type", "website");
      } else {
        params.set("type", "dir");
      }
    }
    const url = `/ipfs/?${params.toString()}`;
    router.push(url);
  };

  // 下载文件链接格式化
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
    return `${dotCID}/ipfs/${item.cid}?${params.toString()}`;
  };

  // 比较路径以判断是否更改
  const oldPathForCompare = renamingItem
    ? currentPath
      ? `${currentPath}/${renamingItem.name}`
      : renamingItem.name
    : "";
  const newPathForCompare = mp.normalizePath(
    ((newDirPath ? `${newDirPath}/` : "") + newName).trim(),
  );
  const isUnchangedRename = oldPathForCompare === newPathForCompare;

  // 判断是否为纯文件夹（没有 CID）
  const isFolder = (item: FileItem) => item.type === "directory" && !item.cid;

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
                <IconFolderUp size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="上传网站">
              <ActionIcon
                size="lg"
                onClick={handleWebsiteUpload}
                color="blue"
                disabled={!wallet || uploadLoading}
              >
                <IconWorld size={18} />
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
                  key={item.cid + item.path + item.name}
                  span={{ base: 12, xs: 6, sm: 4, md: 3, lg: 3, xl: 2 }}
                >
                  <Card radius="md" withBorder>
                    <Group justify="space-between" wrap="nowrap" gap={4}>
                      <Stack
                        flex={1}
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          if (isFolder(item)) {
                            handleFolderClick(item.name);
                          } else {
                            handleOpenFile(item);
                          }
                        }}
                      >
                        <Tooltip label={item.name} openDelay={500} withArrow>
                          <Text fw={500} lineClamp={1}>
                            {item.type === "directory"
                              ? item.cid
                                ? "🌐"
                                : "📁"
                              : "📄"}{" "}
                            {item.name}
                          </Text>
                        </Tooltip>
                      </Stack>
                      <Menu shadow="md" width={120}>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={14} />
                          </ActionIcon>
                        </Menu.Target>

                        <Menu.Dropdown>
                          {!isFolder(item) && (
                            <Menu.Item
                              leftSection="📖"
                              onClick={() => {
                                handleOpenFile(item);
                              }}
                            >
                              打开
                            </Menu.Item>
                          )}

                          <Menu.Item
                            leftSection="✏️"
                            onClick={() => handleRename(item)}
                          >
                            重命名
                          </Menu.Item>

                          <Menu.Divider />

                          {!isFolder(item) && (
                            <Menu.Item
                              leftSection="⬇️"
                              component={Link}
                              target="_blank"
                              href={formatDownload(item)}
                              disabled={formatDownload(item) === "#"}
                            >
                              下载
                            </Menu.Item>
                          )}
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
      <input
        ref={websiteInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory=""
        multiple
        style={{ display: "none" }}
        onChange={handleWebsiteChange}
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
                    <Group align="center" wrap="nowrap">
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
