import {
  Text,
  Grid,
  Card,
  Group,
  Badge,
  Stack,
  Center,
  Button,
  TextInput,
  ActionIcon,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { IconRefresh, IconX } from "@tabler/icons-react";
import "./note.scss";
import { api } from "@/constants/api";
import { useUserStore } from "@/stores/userStore";
import Link from "next/link";

interface NoteItem {
  name: string;
  cid: {
    "/": string;
  };
}

export default function HomeNote() {
  const wallet = useUserStore((state) => state.wallet);
  const [noteList, setNoteList] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(100);

  // 过滤笔记列表
  const filteredNotes = noteList.filter((note) =>
    note.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const fetchNodes = async () => {
    try {
      setLoading(true);
      const res = await api.post("/files/.note");
      if (res.data) {
        setNoteList(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (wallet) {
      fetchNodes();
    }
  }, [wallet]);

  if (!wallet) {
    return (
      <Center>
        <Button variant="gradient" component={Link} href="/login">
          去登录
        </Button>
      </Center>
    );
  }

  if (!noteList.length) {
    return (
      <Stack align="center" justify="center" h={200}>
        <Text size="lg" c="dimmed">
          {loading ? "正在加载" : "暂无笔记"}
        </Text>
        <ActionIcon size="lg" onClick={fetchNodes} mt="md">
          <IconRefresh size={18} />
        </ActionIcon>
      </Stack>
    );
  }

  return (
    <Stack gap="md" p="md" className="note-box">
      <Group justify="space-between" align="center">
        <Badge variant="light" size="lg">
          {searchQuery
            ? `显示 ${displayedNotes.length} / ${filteredNotes.length} (总共 ${noteList.length})`
            : `显示 ${displayedNotes.length} / ${noteList.length}`}{" "}
          个笔记
        </Badge>
      </Group>
      {/* 搜索框 */}
      <Center>
        <TextInput
          placeholder="搜索笔记名称..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
          // leftSection={<IconSearch size={16} />}
          rightSection={
            searchQuery ? (
              <IconX
                size={16}
                style={{ cursor: "pointer" }}
                onClick={() => setSearchQuery("")}
              />
            ) : null
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
                <Card
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  className="note-card"
                >
                  <Stack justify="space-between" h="100%">
                    <Text
                      fw={500}
                      size="sm"
                      lineClamp={1}
                      title={note.name}
                      style={{
                        wordBreak: "break-word",
                        lineHeight: 1.4,
                      }}
                    >
                      {note.name}
                    </Text>
                  </Stack>
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
  );
}
