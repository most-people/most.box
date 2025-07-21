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
} from "@mantine/core";
import { useEffect, useState } from "react";
import {
  IconDotsVertical,
  IconPlus,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { api } from "@/constants/api";
import { useUserStore } from "@/stores/userStore";
import Link from "next/link";
import "./note.scss";
import mp from "@/constants/mp";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";

export default function HomeNote() {
  const wallet = useUserStore((state) => state.wallet);
  const notes = useUserStore((state) => state.notes);
  const setItem = useUserStore((state) => state.setItem);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(100);

  // 添加弹窗相关状态
  const [noteModalOpened, { open: openNoteModal, close: closeNoteModal }] =
    useDisclosure(false);

  const [noteName, setNoteName] = useState("");
  const [noteNameError, setNoteNameError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // 过滤笔记列表
  const filteredNotes = notes
    ? notes.filter((note) => mp.pinyin(note.name, searchQuery, 0))
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
  }, [searchQuery]);

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
      const blob = new Blob(["# 新笔记\n\n✍️ 点击右上角编辑，记录你的灵感"], {
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

  // 重置弹窗状态
  const closeModal = () => {
    setNoteName("");
    setNoteNameError("");
    closeNoteModal();
  };

  useEffect(() => {
    if (wallet && !notes) {
      fetchNotes();
    }
  }, [wallet, notes]);

  if (!wallet) {
    return (
      <Center>
        <Button variant="gradient" component={Link} href="/login">
          去登录
        </Button>
      </Center>
    );
  }

  return (
    <>
      {notes?.length ? (
        <Stack gap="md" p="md" className="note-box">
          <Group justify="space-between" align="center">
            <Badge variant="light" size="lg">
              {searchQuery
                ? `显示 ${displayedNotes.length} / ${filteredNotes.length} (总共 ${notes.length})`
                : `显示 ${displayedNotes.length} / ${notes.length}`}{" "}
              个笔记
            </Badge>
            <Group>
              <ActionIcon size="lg" onClick={openNoteModal} color="green">
                <IconPlus size={18} />
              </ActionIcon>
            </Group>
          </Group>
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

          {/* 搜索结果为空时的提示 */}
          {searchQuery && filteredNotes.length === 0 ? (
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
                      <Group justify="space-between" wrap="nowrap" gap={2}>
                        <Text
                          fw={500}
                          lineClamp={1}
                          component={Link}
                          href={{
                            pathname: "/note",
                            hash: note.cid,
                            query: {
                              uid: wallet.address,
                              name: note.name,
                            },
                          }}
                        >
                          {note.name}
                        </Text>
                        <ActionIcon variant="subtle" color="gary">
                          <IconDotsVertical size={14} />
                        </ActionIcon>
                      </Group>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>

              {hasMore && (
                <Center mt="lg">
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
            <ActionIcon size="lg" onClick={fetchNotes} color="blue">
              <IconRefresh size={18} />
            </ActionIcon>
            <ActionIcon size="lg" onClick={openNoteModal} color="green">
              <IconPlus size={18} />
            </ActionIcon>
          </Group>
        </Stack>
      )}
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
    </>
  );
}
