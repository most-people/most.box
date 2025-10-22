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
} from "@mantine/core";
import { useEffect, useState } from "react";
import { IconDotsVertical, IconPlus, IconRefresh } from "@tabler/icons-react";
import { api } from "@/constants/api";
import { Note, useUserStore } from "@/stores/userStore";
import { useDotStore } from "@/stores/dotStore";
import Link from "next/link";
import "./note.scss";
import mp from "@/constants/mp";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";

export default function HomeNote() {
  const wallet = useUserStore((state) => state.wallet);
  const notes = useUserStore((state) => state.notes);
  const updateRootCID = useDotStore((state) => state.updateRootCID);
  const notesQuery = useUserStore((state) => state.notesQuery);
  const setItem = useUserStore((state) => state.setItem);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(100);

  // 添加弹窗相关状态
  const [noteModalOpened, { open: openNoteModal, close: closeNoteModal }] =
    useDisclosure(false);

  const [noteName, setNoteName] = useState("");
  const [noteGroup, setNoteGroup] = useState("");
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
  const [renameError, setRenameError] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameGroup, setRenameGroup] = useState("");
  const [renameBaseName, setRenameBaseName] = useState("");

  const shareUrl = (note: Note) => {
    const shareUrl = new URL(window.location.href);
    shareUrl.pathname = "/note/";
    shareUrl.searchParams.set("uid", wallet?.address || "");
    shareUrl.searchParams.set("name", note.name);
    shareUrl.searchParams.set("cid", note.cid);
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
      setFetchLoading(true);
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
      console.info(error);
      // notifications.show({ message: (error as Error).message, color: "red" });
    } finally {
      setFetchLoading(false);
    }
  };

  // 创建笔记函数
  const createNote = async () => {
    const group = noteGroup.trim();
    const base = noteName.trim();

    // 验证笔记名称
    if (!base) {
      setNoteNameError("请输入笔记名称");
      return;
    }

    if (group.includes("/") || base.includes("/")) {
      setNoteNameError("不能包含字符 /");
      return;
    }

    const name = group ? `${group}-${base}` : base;

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
        updateRootCID();
        notifications.show({
          color: "green",
          message: "笔记创建成功",
        });

        closeNoteModal();
        // 重新获取笔记列表
        await fetchNotes();
        setNoteName("");
        setNoteGroup("");
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
    setRenameError("");
    // 解析当前名称为 分组-名称 的结构
    const idx = note.name.indexOf("-");
    if (idx > 0) {
      const g = note.name.slice(0, idx);
      const n = note.name.slice(idx + 1);
      setRenameGroup(g);
      setRenameBaseName(n);
    } else {
      setRenameGroup("");
      setRenameBaseName(note.name);
    }
    openRenameModal();
  };

  const handleOpen = (note: Note) => {
    const url = shareUrl(note);
    window.open(url);
  };

  // 执行重命名
  const executeRename = async () => {
    if (!currentNote) return;

    const group = renameGroup.trim();
    const base = renameBaseName.trim();

    if (!base) {
      setRenameError("请输入名称");
      return;
    }

    if (group.includes("/") || base.includes("/")) {
      setRenameError("不能包含字符 /");
      return;
    }

    const name = group ? `${group}-${base}` : base;

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
      await api.put("/files.rename", {
        oldName: `/.note/${currentNote.name}`,
        newName: `/.note/${name}`,
      });

      notifications.show({
        color: "green",
        message: "重命名成功",
      });

      closeRenameModal();
      await fetchNotes();
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
    window.open(`/ipfs/${note.cid}/?filename=${note.name}&type=note`);
  };

  // 重置弹窗状态
  const closeModal = () => {
    setNoteName("");
    setNoteGroup("");
    setNoteNameError("");
    closeNoteModal();
  };

  // 重置重命名弹窗状态
  const closeRenameModalAndReset = () => {
    setCurrentNote(null);
    setRenameGroup("");
    setRenameBaseName("");
    setRenameError("");
    closeRenameModal();
  };

  useEffect(() => {
    if (wallet && !notes) {
      fetchNotes();
    }
  }, [wallet, notes]);

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
              ? `显示 ${displayedNotes.length} / ${
                  filteredNotes.length
                } (总共 ${notes?.length || 0})`
              : `显示 ${displayedNotes.length} / ${notes?.length || 0}`}{" "}
            {""}
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
            {(() => {
              // 构建分组：以第一个 "-" 之前的部分作为前缀
              const grouped = new Map<string, Note[]>();
              const ungrouped: Note[] = [];

              displayedNotes.forEach((note) => {
                const idx = note.name.indexOf("-");
                if (idx > 0) {
                  const prefix = note.name.slice(0, idx);
                  const arr = grouped.get(prefix) || [];
                  arr.push(note);
                  grouped.set(prefix, arr);
                } else {
                  ungrouped.push(note);
                }
              });

              return (
                <Grid gutter="md">
                  {[...grouped.entries()].map(([prefix, items]) => (
                    <Grid.Col
                      key={`group-${prefix}`}
                      span={{ base: 12, xs: 6, sm: 4, md: 3, lg: 3, xl: 2 }}
                    >
                      <Card radius="md" withBorder>
                        <Group
                          justify="space-between"
                          wrap="nowrap"
                          gap={4}
                          mb="xs"
                        >
                          <Text fw={700}>{prefix}</Text>
                          <Badge variant="light">{items.length}</Badge>
                        </Group>
                        <Stack gap={0}>
                          {items.map((note) => {
                            const subName = note.name.slice(prefix.length + 1);
                            return (
                              <Group
                                key={note.name}
                                justify="space-between"
                                wrap="nowrap"
                                gap={0}
                              >
                                <Box
                                  py={6}
                                  className="mp-hover"
                                  flex={1}
                                  component={Link}
                                  href={shareUrl(note)}
                                >
                                  <Text
                                    fw={500}
                                    lineClamp={1}
                                    c="var(--mantine-color-text)"
                                  >
                                    {subName || note.name}
                                  </Text>
                                </Box>
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
                            );
                          })}
                        </Stack>
                      </Card>
                    </Grid.Col>
                  ))}

                  {ungrouped.map((note) => (
                    <Grid.Col
                      key={note.name}
                      span={{ base: 12, xs: 6, sm: 4, md: 3, lg: 3, xl: 2 }}
                    >
                      <Card radius="md" withBorder>
                        <Group justify="space-between" wrap="nowrap" gap={0}>
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
              );
            })()}
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
            label="分组（可选）"
            value={noteGroup}
            onChange={(e) => {
              const g = e.currentTarget.value;
              setNoteGroup(g);
              setNoteNameError("");
            }}
          />
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

      <Modal
        opened={renameModalOpened}
        onClose={closeRenameModalAndReset}
        title="笔记重命名"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="分组（可选）"
            value={renameGroup}
            onChange={(e) => {
              const g = e.currentTarget.value;
              setRenameGroup(g);
              setRenameError("");
            }}
          />
          <TextInput
            label="名称"
            placeholder="请输入名称"
            value={renameBaseName}
            onChange={(e) => {
              const n = e.currentTarget.value;
              setRenameBaseName(n);
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
