"use client";
import { useState, useRef, useMemo } from "react";
import dayjs from "dayjs";
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
  CopyButton,
  Code,
  Table,
} from "@mantine/core";
import "./file.scss";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconFolderPlus,
  IconDotsVertical,
  IconPlus,
  IconFolderUp,
  IconWorld,
  IconInfoCircle,
  IconCopy,
  IconCheck,
  IconExternalLink,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import mp from "@/utils/mp";
import { FileItem, useUserStore } from "@/stores/userStore";
import { useFileExplorer } from "@/hooks/useExplorer";
import { useUploadStore } from "@/stores/uploadStore";
import UploadProgress from "@/components/UploadProgress";
import { CRUST_SUBSCAN, MAX_FILE_SIZE } from "@/constants";

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
  const {
    addFiles,
    addDirectory,
    isUploading: uploadLoading,
  } = useUploadStore();
  const [renameModalOpen, setRenameModalOpen] = useState(false); // 重命名模态框状态
  const [renamingItem, setRenamingItem] = useState<FileItem | null>(null); // 当前正在重命名的项目
  const [newName, setNewName] = useState(""); // 新名称
  const [newDirPath, setNewDirPath] = useState(""); // 新目录路径
  const [renameLoading, setRenameLoading] = useState(false); // 重命名加载状态

  // 属性查看状态
  const [attributesModalOpen, setAttributesModalOpen] = useState(false);
  const [selectedFileForAttributes, setSelectedFileForAttributes] =
    useState<FileItem | null>(null);

  // 计算选中文件的大小（如果是文件夹，递归计算）
  const selectedFileSize = useMemo(() => {
    if (!selectedFileForAttributes) return 0;
    if (selectedFileForAttributes.type !== "directory") {
      return selectedFileForAttributes.size;
    }

    const dirPath = selectedFileForAttributes.path
      ? `${selectedFileForAttributes.path}/${selectedFileForAttributes.name}`
      : selectedFileForAttributes.name;
    const normalizedDirPath = mp.normalizePath(dirPath);

    return files.reduce((acc, file) => {
      // 只计算文件，不重复计算目录（因为目录大小通常为0或需要递归计算）
      if (file.type !== "file") return acc;

      const fileDirPath = mp.normalizePath(file.path);

      // 如果文件在目录下（直接或间接）
      if (
        fileDirPath === normalizedDirPath ||
        fileDirPath.startsWith(normalizedDirPath + "/")
      ) {
        return acc + file.size;
      }
      return acc;
    }, 0);
  }, [selectedFileForAttributes, files]);

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

    addFiles(files, currentPath, false);
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

    const fileArray = Array.from(files);

    // Check for large files in website upload
    // const MAX_SIZE = 200 * 1024 * 1024; // 200MB
    const oversizedFiles = fileArray.filter((file) => file.size > MAX_FILE_SIZE);

    if (oversizedFiles.length > 0) {
      setLargeFiles(oversizedFiles);
      setShowLargeFileModal(true);
      // Clear input
      event.target.value = "";
      return;
    }

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

    const folderName =
      fileArray[0]?.webkitRelativePath?.split("/")[0] || "Website";
    const totalSize = fileArray.reduce((acc, file) => acc + file.size, 0);

    // 网站上传通常作为整体，不使用预览模式，直接开始
    // 如果需要预览，可以将 autoStart 设置为 false
    addDirectory(ipfsFiles, folderName, totalSize, currentPath, false);

    // 清空输入框
    event.target.value = "";
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
      // const MAX_SIZE = 200 * 1024 * 1024; // 200MB
      const oversizedFiles = fileArray.filter((file) => file.size > MAX_FILE_SIZE);

      if (oversizedFiles.length > 0) {
        setLargeFiles(oversizedFiles);
        setShowLargeFileModal(true);
        // 清空输入框以便重新选择
        event.target.value = "";
        return;
      }

      uploadFiles(fileArray);
    }
    // 清空input值，允许重复选择同一文件
    event.target.value = "";
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

  // 显示属性函数
  const handleShowAttributes = (item: FileItem) => {
    setSelectedFileForAttributes(item);
    setAttributesModalOpen(true);
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

                          <Menu.Item
                            leftSection="⚙️"
                            onClick={() => handleShowAttributes(item)}
                          >
                            属性
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

      {/* 属性查看模态框 */}
      <Modal
        opened={attributesModalOpen}
        onClose={() => setAttributesModalOpen(false)}
        title="文件属性"
        centered
      >
        {selectedFileForAttributes && (
          <Stack gap="md">
            <Table withTableBorder withColumnBorders>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Th w={100}>名称</Table.Th>
                  <Table.Td style={{ wordBreak: "break-all" }}>
                    {selectedFileForAttributes.name}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>大小</Table.Th>
                  <Table.Td>{mp.formatFileSize(selectedFileSize)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Th>类型</Table.Th>
                  <Table.Td>
                    <Badge
                      variant="light"
                      color={
                        selectedFileForAttributes.type === "directory"
                          ? "blue"
                          : "gray"
                      }
                    >
                      {selectedFileForAttributes.type === "directory"
                        ? "文件夹"
                        : "文件"}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
                {selectedFileForAttributes.expired_at ? (
                  <Table.Tr>
                    <Table.Th>过期时间</Table.Th>
                    <Table.Td>
                      {dayjs(selectedFileForAttributes.expired_at).format(
                        "YYYY-MM-DD HH:mm:ss",
                      )}
                    </Table.Td>
                  </Table.Tr>
                ) : null}

                {selectedFileForAttributes.tx_hash ? (
                  <Table.Tr>
                    <Table.Th>交易哈希</Table.Th>
                    <Table.Td>
                      <Anchor
                        href={`${CRUST_SUBSCAN}/extrinsic/${selectedFileForAttributes.tx_hash}`}
                        target="_blank"
                        size="sm"
                      >
                        {selectedFileForAttributes.tx_hash}
                      </Anchor>
                    </Table.Td>
                  </Table.Tr>
                ) : null}

                {selectedFileForAttributes.cid ? (
                  <Table.Tr>
                    <Table.Th>CID</Table.Th>
                    <Table.Td>
                      <Anchor
                        href={`${dotCID}/ipfs/${selectedFileForAttributes.cid}`}
                        target="_blank"
                        size="sm"
                      >
                        {selectedFileForAttributes.cid}
                      </Anchor>
                    </Table.Td>
                  </Table.Tr>
                ) : null}
              </Table.Tbody>
            </Table>
          </Stack>
        )}
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
                const params = new URLSearchParams();
                if (currentPath) params.set("path", currentPath);
                router.push(`/upload?${params.toString()}`);
              }}
              color="blue"
            >
              前往大文件上传
            </Button>
          </Group>
        </Stack>
      </Modal>
      <UploadProgress />
    </>
  );
}
