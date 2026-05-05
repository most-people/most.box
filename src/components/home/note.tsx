import "./note.scss";
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
  Breadcrumbs,
  Anchor,
} from "@mantine/core";
import { useState } from "react";
import {
  IconDotsVertical,
  IconPlus,
  IconFolderPlus,
} from "@tabler/icons-react";
import { NoteItem, useUserStore } from "@/stores/userStore";
import Link from "next/link";
import mp from "@/utils/mp";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { useNoteExplorer } from "@/hooks/useExplorer";

export default function HomeNote() {
  const wallet = useUserStore((state) => state.wallet);
  const setItem = useUserStore((state) => state.setItem);

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
  } = useNoteExplorer();

  const notes = useUserStore((state) => state.notes);

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
  const [currentNote, setCurrentNote] = useState<NoteItem | null>(null);
  const [renameError, setRenameError] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameDirPath, setRenameDirPath] = useState("");
  const [renameBaseName, setRenameBaseName] = useState("");

  const openUrl = (note: NoteItem) => {
    const openUrl = new URL(window.location.href);
    openUrl.pathname = "/note/";
    openUrl.searchParams.set("cid", note.cid);
    return openUrl.href;
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
      filteredItems?.some((note) => note.name === base && note.type === "file")
    ) {
      setNoteNameError("笔记名称已存在");
      return;
    }

    try {
      setCreateLoading(true);

      // 本地创建笔记
      await useUserStore.getState().addNote({
        name: base,
        size: 0,
        type: "file",
        path: currentPath,
        content: "",
        updated_at: Date.now(),
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
      filteredItems.some(
        (item) => item.type === "directory" && item.name === name,
      )
    ) {
      notifications.show({ message: "文件夹已存在", color: "red" });
      return;
    }

    try {
      setNewFolderLoading(true);
      const targetPath = `${currentPath}/${name}`;

      await useUserStore.getState().addNote({
        name: "index",
        size: 0,
        type: "file",
        path: targetPath,
        content: "",
        updated_at: Date.now(),
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
  const handleRename = (note: NoteItem) => {
    setCurrentNote(note);
    setRenameError("");
    setRenameBaseName(note.name);
    setRenameDirPath(note.path.replace(/^notes\/?/, ""));
    openRenameModal();
  };

  const handleEdit = (note: NoteItem) => {
    const url = new URL(openUrl(note));
    url.searchParams.set("mode", "edit");
    window.open(url.href);
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
    const newFullPath = mp.normalizePath(
      targetDir === "" ? base : `${targetDir}/${base}`,
    );

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
      const oldPath = mp.normalizePath(
        currentNote.path === ""
          ? currentNote.name
          : `${currentNote.path}/${currentNote.name}`,
      );
      useUserStore.getState().renameNote(oldPath, targetDir, base);

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
  const handleDelete = (item: NoteItem) => {
    const isDir = item.type === "directory";
    modals.openConfirmModal({
      title: "提示",
      centered: true,
      children: (
        <Text size="sm">
          确定要删除{isDir ? "文件夹" : "笔记"} &quot;{item.name}
          &quot; 吗？此操作不可撤销。
        </Text>
      ),
      labels: { confirm: "确定", cancel: "取消" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
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
              useUserStore
                .getState()
                .deleteNote(undefined, file.path, file.name);
            });
          } else {
            useUserStore.getState().deleteNote(undefined, item.path, item.name);
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
      },
    });
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
                } (总共 ${notes?.length || 0})`
              : `显示 ${displayedItems.length} / ${notes?.length || 0}`}{" "}
            个笔记
          </Badge>
          <Group>
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
        {searchQuery && filteredItems.length === 0 ? (
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
            {!searchQuery && (
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
            )}

            <Grid gutter="md">
              {displayedItems.map((note) => (
                <Grid.Col
                  key={note.cid + note.path + note.name}
                  span={{ base: 12, xs: 6, sm: 4, md: 3, lg: 3, xl: 2 }}
                >
                  <Card radius="md" withBorder>
                    <Group justify="space-between" wrap="nowrap" gap={0}>
                      <Tooltip label={note.name} openDelay={500} withArrow>
                        <Text
                          flex={1}
                          fw={500}
                          lineClamp={1}
                          component={
                            (note.type === "directory" ? "div" : Link) as any
                          }
                          href={
                            note.type === "directory"
                              ? undefined
                              : openUrl(note)
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
                      </Tooltip>
                      <Menu shadow="md" width={120}>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={14} />
                          </ActionIcon>
                        </Menu.Target>

                        <Menu.Dropdown>
                          {note.type === "file" && (
                            <Menu.Item
                              leftSection="✍️"
                              onClick={() => handleEdit(note)}
                            >
                              编辑
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
