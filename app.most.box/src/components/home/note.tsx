import {
  Stack,
  Text,
  Button,
  Center,
  Group,
  ActionIcon,
  Badge,
  TextInput,
  Grid,
  Card,
  Modal,
  Menu,
  Tooltip,
  LoadingOverlay,
  Box,
  Breadcrumbs,
  Anchor,
} from "@mantine/core";
import { useEffect, useState, useMemo } from "react";
import {
  IconDotsVertical,
  IconPlus,
  IconRefresh,
  IconFolderPlus,
} from "@tabler/icons-react";
import { FileItem, useUserStore } from "@/stores/userStore";
import Link from "next/link";
import "./note.scss";
import mp from "@/utils/mp";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";

export default function HomeNote() {
  const wallet = useUserStore((state) => state.wallet);
  const notesQuery = useUserStore((state) => state.notesQuery);
  const notesPath = useUserStore((state) => state.notesPath);
  const setItem = useUserStore((state) => state.setItem);

  const [fetchLoading, setFetchLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(100);

  // 添加弹窗相关状态
  const [noteModalOpened, { open: openNoteModal, close: closeNoteModal }] =
    useDisclosure(false);

  const [noteName, setNoteName] = useState("");
  const [noteNameError, setNoteNameError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // 新建文件夹相关状态
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderLoading, setNewFolderLoading] = useState(false);

  // 添加重命名相关状态
  const [
    renameModalOpened,
    { open: openRenameModal, close: closeRenameModal },
  ] = useDisclosure(false);
  const [currentNote, setCurrentNote] = useState<FileItem | null>(null);
  const [renameError, setRenameError] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameDirPath, setRenameDirPath] = useState("");
  const [renameBaseName, setRenameBaseName] = useState("");

  const shareUrl = (note: FileItem) => {
    const shareUrl = new URL(window.location.href);
    shareUrl.pathname = "/note/";
    shareUrl.searchParams.set("uid", wallet?.address || "");
    shareUrl.searchParams.set("name", note.name);
    if (note.cid) {
      shareUrl.searchParams.set("cid", note.cid);
    }
    return shareUrl.href;
  };

  const notes = useUserStore((state) => state.notes);

  // 过滤笔记列表
  const currentPath = mp.normalizePath(notesPath || "");

  const filteredNotes = useMemo(() => {
    if (!notes) return [];

    if (notesQuery) {
      return notes
        .filter((note) => mp.pinyin(note.name, notesQuery, 0))
        .sort((a, b) => {
          if (a.type === "directory" && b.type !== "directory") return -1;
          if (a.type !== "directory" && b.type === "directory") return 1;
          return 0;
        });
    }

    // 1. 获取直接在该路径下的文件
    const directFiles = notes.filter(
      (file) => file.path === currentPath && file.type === "file",
    );

    // 2. 获取该路径下的所有子目录（推导出的虚拟目录）
    const inferredDirs = new Map<string, FileItem>();

    notes.forEach((file) => {
      const fPath = file.path;

      if (fPath === currentPath) return; // 跳过当前目录

      if (currentPath === "" || fPath.startsWith(currentPath + "/")) {
        const relativePath =
          currentPath === "" ? fPath : fPath.slice(currentPath.length + 1);
        if (relativePath) {
          const firstSegment = relativePath.split("/")[0];
          if (!inferredDirs.has(firstSegment)) {
            inferredDirs.set(firstSegment, {
              name: firstSegment,
              type: "directory",
              path: currentPath,
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
  }, [notes, currentPath, notesQuery]);

  // 获取当前显示的笔记列表
  const displayedNotes = filteredNotes.slice(0, displayCount);
  const hasMore = filteredNotes.length > displayCount;

  // 加载更多函数
  const loadMore = () => {
    setDisplayCount((prev) => prev + 100);
  };

  // 重置显示数量（搜索时使用）
  useEffect(() => {
    setDisplayCount(100);
  }, [notesQuery]);

  const fetchNotes = async () => {
    // 纯本地应用，不需要刷新
  };

  // 创建笔记函数
  const createNote = async () => {
    const base = noteName.trim();

    // 验证笔记名称
    if (!base) {
      setNoteNameError("请输入笔记名称");
      return;
    }

    if (base.includes("/")) {
      setNoteNameError("不能包含字符 /");
      return;
    }

    // 检查是否已存在同名笔记
    if (
      filteredNotes?.some((note) => note.name === base && note.type === "file")
    ) {
      setNoteNameError("笔记名称已存在");
      return;
    }

    try {
      setCreateLoading(true);

      // 本地创建笔记
      useUserStore.getState().addNote({
        name: base,
        size: 0,
        type: "file",
        path: currentPath,
      });

      notifications.show({
        color: "green",
        message: "笔记创建成功",
      });

      closeNoteModal();
      setNoteName("");
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "创建失败，请重试",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;

    if (
      filteredNotes.some(
        (item) => item.type === "directory" && item.name === name,
      )
    ) {
      notifications.show({ message: "文件夹已存在", color: "red" });
      return;
    }

    try {
      setNewFolderLoading(true);
      const targetPath = `${currentPath}/${name}`;

      useUserStore.getState().addNote({
        name: "index.md",
        size: 0,
        type: "file",
        path: targetPath,
      });

      notifications.show({ message: "文件夹创建成功", color: "green" });
      setNewFolderModalOpen(false);
      setNewFolderName("");
    } catch (error: any) {
      notifications.show({
        message: error.message || "创建文件夹失败",
        color: "red",
      });
    } finally {
      setNewFolderLoading(false);
    }
  };

  // 重命名笔记函数
  const handleRename = (note: FileItem) => {
    setCurrentNote(note);
    setRenameError("");
    setRenameBaseName(note.name);
    setRenameDirPath(note.path.replace(/^notes\/?/, ""));
    openRenameModal();
  };

  const handleOpen = (note: FileItem) => {
    if (note.type === "directory") {
      handleFolderClick(note.name);
    } else {
      const url = shareUrl(note);
      window.open(url);
    }
  };

  // 执行重命名
  const executeRename = async () => {
    if (!currentNote) return;

    const base = renameBaseName.trim();
    const dir = renameDirPath.trim();

    if (!base) {
      setRenameError("请输入名称");
      return;
    }

    if (base.includes("/")) {
      setRenameError("不能包含字符 /");
      return;
    }

    const targetDir = mp.normalizePath(dir || "");
    const oldFullPath = mp.normalizePath(
      currentNote.path === ""
        ? currentNote.name
        : `${currentNote.path}/${currentNote.name}`,
    );
    const newFullPath = mp.normalizePath(
      targetDir === "" ? base : `${targetDir}/${base}`,
    );

    if (oldFullPath === newFullPath) {
      closeRenameModal();
      return;
    }

    if (
      notes.some(
        (f) =>
          mp.normalizePath(f.path === "" ? f.name : `${f.path}/${f.name}`) ===
          newFullPath,
      )
    ) {
      setRenameError("名称已存在");
      return;
    }

    try {
      setRenameLoading(true);
      useUserStore.getState().renameNote(oldFullPath, targetDir, base);

      notifications.show({
        color: "green",
        message: "操作成功",
      });

      closeRenameModal();
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "操作失败",
      });
    } finally {
      setRenameLoading(false);
    }
  };

  // 删除笔记函数
  const handleDelete = async (item: FileItem) => {
    const isDir = item.type === "directory";
    if (
      confirm(
        `确定要删除${isDir ? "文件夹" : "笔记"}"${item.name}"吗？此操作不可撤销。`,
      )
    ) {
      try {
        if (isDir) {
          const fullPath = mp.normalizePath(
            currentPath === "" ? item.name : `${currentPath}/${item.name}`,
          );
          const notesToDelete = notes.filter((file) => {
            const fFullPath = mp.normalizePath(
              file.path === "" ? file.name : `${file.path}/${file.name}`,
            );
            return (
              fFullPath === fullPath || fFullPath.startsWith(fullPath + "/")
            );
          });
          notesToDelete.forEach((file) => {
            useUserStore.getState().deleteNote(file.cid, file.path, file.name);
          });
        } else {
          useUserStore.getState().deleteNote(item.cid, item.path, item.name);
        }

        notifications.show({
          color: "green",
          message: "删除成功",
        });
      } catch (error) {
        notifications.show({
          color: "red",
          message: error instanceof Error ? error.message : "删除失败",
        });
      }
    }
  };

  // 分享笔记函数
  const handleShare = (note: FileItem) => {
    window.open(`/ipfs/${note.cid}/?filename=${note.name}&type=note`);
  };

  // 处理文件夹点击
  const handleFolderClick = (folderName: string) => {
    const newPath = notesPath ? `${notesPath}/${folderName}` : folderName;
    setItem("notesPath", newPath);
  };

  // 面包屑点击跳转
  const handleBreadcrumbClick = (index: number) => {
    const parts = (notesPath || "").split("/").filter(Boolean);
    if (index < 0) {
      setItem("notesPath", "");
      return;
    }
    const newPath = parts.slice(0, index + 1).join("/");
    setItem("notesPath", newPath);
  };

  // 重置弹窗状态
  const closeModal = () => {
    setNoteName("");
    setNoteNameError("");
    closeNoteModal();
  };

  // 重置重命名弹窗状态
  const closeRenameModalAndReset = () => {
    setCurrentNote(null);
    setRenameDirPath("");
    setRenameBaseName("");
    setRenameError("");
    closeRenameModal();
  };

  return (
    <>
      <Stack gap="md" p="md">
        {/* 搜索框 */}
        <Center>
          <TextInput
            placeholder="搜索笔记名称"
            value={notesQuery}
            onChange={(event) =>
              setItem("notesQuery", event.currentTarget.value)
            }
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
            {notesQuery
              ? `显示 ${displayedNotes.length} / ${filteredNotes.length} (总共 ${notes.length})`
              : `显示 ${displayedNotes.length} / ${notes.length}`}{" "}
            个笔记
          </Badge>
          <Group>
            <Tooltip label="刷新">
              <ActionIcon
                size="lg"
                onClick={fetchNotes}
                color="blue"
                disabled={!wallet}
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="新笔记">
              <ActionIcon
                size="lg"
                onClick={openNoteModal}
                color="green"
                disabled={!wallet}
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="新建文件夹">
              <ActionIcon
                size="lg"
                onClick={() => setNewFolderModalOpen(true)}
                color="yellow"
                disabled={!wallet}
              >
                <IconFolderPlus size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* 搜索结果为空时的提示 */}
        {notesQuery && filteredNotes.length === 0 ? (
          <Stack align="center" justify="center" h={200}>
            <Text size="lg" c="dimmed">
              未找到笔记
            </Text>
            <Text size="sm" c="dimmed">
              尝试用其他关键词搜索
            </Text>
          </Stack>
        ) : (
          <>
            {!notesQuery && (
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
                        笔记
                      </Anchor>
                      {(notesPath || "")
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
            )}

            <Grid gutter="md">
              {displayedNotes.map((note) => (
                <Grid.Col
                  key={(note.cid || "") + note.path + note.name}
                  span={{ base: 12, xs: 6, sm: 4, md: 3, lg: 3, xl: 2 }}
                >
                  <Card radius="md" withBorder>
                    <Group justify="space-between" wrap="nowrap" gap={0}>
                      <Text
                        flex={1}
                        fw={500}
                        lineClamp={1}
                        component={
                          (note.type === "directory" ? "div" : Link) as any
                        }
                        href={
                          note.type === "directory" ? undefined : shareUrl(note)
                        }
                        onClick={() => {
                          if (note.type === "directory") {
                            handleFolderClick(note.name);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        {note.type === "directory" ? "📁" : "📝"} {note.name}
                      </Text>
                      <Menu shadow="md" width={120}>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={14} />
                          </ActionIcon>
                        </Menu.Target>

                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection="📖"
                            onClick={() => handleOpen(note)}
                          >
                            打开
                          </Menu.Item>
                          {note.type === "file" && note.cid && (
                            <Menu.Item
                              leftSection="📤"
                              onClick={() => handleShare(note)}
                            >
                              分享
                            </Menu.Item>
                          )}
                          <Menu.Item
                            leftSection="✏️"
                            onClick={() => handleRename(note)}
                          >
                            重命名
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            leftSection="🗑️"
                            onClick={() => handleDelete(note)}
                          >
                            删除
                          </Menu.Item>
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
                  继续加载 ({filteredNotes.length - displayCount} 个剩余)
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

      {/* 创建笔记弹窗 */}
      <Modal
        opened={noteModalOpened}
        onClose={closeModal}
        title="创建新笔记"
        centered
      >
        <Stack gap="md">
          <TextInput
            placeholder="请输入笔记名称"
            value={noteName}
            onChange={(event) => {
              setNoteName(event.currentTarget.value);
              setNoteNameError("");
            }}
            error={noteNameError}
            autoFocus
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal}>
              取消
            </Button>
            <Button loading={createLoading} onClick={createNote}>
              创建
            </Button>
          </Group>
        </Stack>
      </Modal>

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
        opened={renameModalOpened}
        onClose={closeRenameModalAndReset}
        title="重命名 / 移动"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="目录路径"
            placeholder="根目录留空，例如: study/math"
            value={renameDirPath}
            onChange={(e) => {
              setRenameDirPath(e.currentTarget.value);
              setRenameError("");
            }}
          />
          <TextInput
            label="名称"
            placeholder="请输入名称"
            value={renameBaseName}
            onChange={(e) => {
              setRenameBaseName(e.currentTarget.value);
              setRenameError("");
            }}
            error={renameError}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeRenameModalAndReset}>
              取消
            </Button>
            <Button loading={renameLoading} onClick={executeRename}>
              确认
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
