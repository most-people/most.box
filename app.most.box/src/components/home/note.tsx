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
} from "@mantine/core";
import { useEffect, useState } from "react";
import { IconDotsVertical, IconPlus, IconRefresh } from "@tabler/icons-react";
import { api } from "@/constants/api";
import { Note, useUserStore } from "@/stores/userStore";
import Link from "next/link";
import "./note.scss";
import mp from "@/constants/mp";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";

export default function HomeNote() {
  const wallet = useUserStore((state) => state.wallet);
  const notes = useUserStore((state) => state.notes);
  const notesQuery = useUserStore((state) => state.notesQuery);
  const setItem = useUserStore((state) => state.setItem);
  const [loading, setLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(100);

  // 添加弹窗相关状态
  const [noteModalOpened, { open: openNoteModal, close: closeNoteModal }] =
    useDisclosure(false);

  const [noteName, setNoteName] = useState("");
  const [noteNameError, setNoteNameError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // 添加重命名相关状态
  const [
    renameModalOpened,
    { open: openRenameModal, close: closeRenameModal },
  ] = useDisclosure(false);
  const [currentNote, setCurrentNote] = useState<{
    name: string;
    cid: string;
  } | null>(null);
  const [newNoteName, setNewNoteName] = useState("");
  const [renameError, setRenameError] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);

  const shareUrl = (note: Note) => {
    const shareUrl = new URL(window.location.origin);
    shareUrl.pathname = "/note/";
    shareUrl.searchParams.set("uid", wallet?.address || "");
    shareUrl.searchParams.set("name", note.name);
    shareUrl.hash = note.cid;
    return shareUrl.href;
  };

  // 过滤笔记列表
  const filteredNotes = notes
    ? notes.filter((note) => mp.pinyin(note.name, notesQuery, 0))
    : [];

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
    try {
      setLoading(true);
      const res = await api.post("/files/.note");
      const list = res.data as { name: string; cid: { "/": string } }[];
      if (list) {
        const notes = list.map((item) => ({
          name: item.name,
          cid: item.cid["/"],
        }));
        setItem("notes", notes);
      }
    } catch (error) {
      notifications.show({
        message: (error as Error).message,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  // 创建笔记函数
  const createNote = async () => {
    const name = noteName.trim();
    // 验证笔记名称
    if (!name) {
      setNoteNameError("请输入笔记名称");
      return;
    }

    // 检查是否已存在同名笔记
    if (notes?.some((note) => note.name === name)) {
      setNoteNameError("笔记名称已存在");
      return;
    }

    try {
      setCreateLoading(true);

      const formData = new FormData();
      const blob = new Blob([""], {
        type: "text/markdown",
      });
      formData.append("file", blob, "index.md");
      formData.append("path", `/.note/${name}/index.md`);
      const res = await api.put("/files.upload", formData);
      const cid = res.data?.cid;
      if (cid) {
        notifications.show({
          color: "green",
          message: "笔记创建成功",
        });

        // 重新获取笔记列表
        await fetchNotes();
        closeNoteModal();
        setNoteName("");
      }
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "创建失败，请重试",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // 重命名笔记函数
  const handleRename = (note: Note) => {
    setCurrentNote(note);
    setNewNoteName(note.name);
    setRenameError("");
    openRenameModal();
  };

  const handleOpen = (note: Note) => {
    const url = shareUrl(note);
    window.open(url);
  };

  // 执行重命名
  const executeRename = async () => {
    if (!currentNote) return;

    const name = newNoteName.trim();
    if (!name) {
      setRenameError("请输入笔记名称");
      return;
    }

    if (name === currentNote.name) {
      closeRenameModal();
      return;
    }

    if (notes?.some((note) => note.name === name)) {
      setRenameError("笔记名称已存在");
      return;
    }

    try {
      setRenameLoading(true);
      // 这里添加重命名的API调用
      await api.put("/files.rename", {
        oldName: `/.note/${currentNote.name}`,
        newName: `/.note/${name}`,
      });

      notifications.show({
        color: "green",
        message: "重命名成功",
      });

      await fetchNotes();
      closeRenameModal();
    } catch (error) {
      notifications.show({
        color: "red",
        message: error instanceof Error ? error.message : "重命名失败",
      });
    } finally {
      setRenameLoading(false);
    }
  };

  // 删除笔记函数
  const handleDelete = async (note: Note) => {
    if (confirm(`确定要删除笔记"${note.name}"吗？此操作不可撤销。`)) {
      try {
        // 这里添加删除的API调用
        await api.delete(`/files/.note/${note.name}`);

        notifications.show({
          color: "green",
          message: "删除成功",
        });

        await fetchNotes();
      } catch (error) {
        notifications.show({
          color: "red",
          message: error instanceof Error ? error.message : "删除失败",
        });
      }
    }
  };

  // 分享笔记函数
  const handleShare = (note: Note) => {
    const url = shareUrl(note);

    if (navigator.share) {
      navigator.share({
        title: `笔记: ${note.name}`,
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

  // 重置弹窗状态
  const closeModal = () => {
    setNoteName("");
    setNoteNameError("");
    closeNoteModal();
  };

  // 重置重命名弹窗状态
  const closeRenameModalAndReset = () => {
    setCurrentNote(null);
    setNewNoteName("");
    setRenameError("");
    closeRenameModal();
  };

  useEffect(() => {
    if (wallet && !notes) {
      fetchNotes();
    }
  }, [wallet, notes]);

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
      {notes?.length ? (
        <Stack gap="md" p="md" className="note-box">
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

          <Group justify="space-between" align="center">
            <Badge variant="light" size="lg">
              {notesQuery
                ? `显示 ${displayedNotes.length} / ${filteredNotes.length} (总共 ${notes.length})`
                : `显示 ${displayedNotes.length} / ${notes.length}`}{" "}
              个笔记
            </Badge>
            <Group>
              <Tooltip label="刷新">
                <ActionIcon size="lg" onClick={fetchNotes} color="blue">
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="新笔记">
                <ActionIcon size="lg" onClick={openNoteModal} color="green">
                  <IconPlus size={18} />
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
              <Grid gutter="md">
                {displayedNotes.map((note) => (
                  <Grid.Col
                    key={note.name}
                    span={{ base: 12, xs: 6, sm: 4, md: 3, lg: 3, xl: 2 }}
                  >
                    <Card radius="md" withBorder>
                      <Group justify="space-between" wrap="nowrap" gap={4}>
                        <Text
                          flex={1}
                          fw={500}
                          lineClamp={1}
                          component={Link}
                          href={shareUrl(note)}
                        >
                          {note.name}
                        </Text>
                        <Menu shadow="md" width={120}>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gary">
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
                            <Menu.Item
                              leftSection="📤"
                              onClick={() => handleShare(note)}
                            >
                              分享
                            </Menu.Item>
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
      ) : (
        <Stack align="center" justify="center" h={200}>
          <Text size="lg" c="dimmed">
            {loading ? "正在加载" : "暂无笔记"}
          </Text>
          <Group>
            <Tooltip label="刷新">
              <ActionIcon size="lg" onClick={fetchNotes} color="blue">
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="新笔记">
              <ActionIcon size="lg" onClick={openNoteModal} color="green">
                <IconPlus size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Stack>
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

      {/* 重命名弹窗 */}
      <Modal
        opened={renameModalOpened}
        onClose={closeRenameModalAndReset}
        title="重命名笔记"
        centered
      >
        <Stack gap="md">
          <TextInput
            placeholder="请输入新的笔记名称"
            value={newNoteName}
            onChange={(event) => {
              setNewNoteName(event.currentTarget.value);
              setRenameError("");
            }}
            error={renameError}
            autoFocus
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
