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
} from "@mantine/core";
import { useEffect, useState } from "react";
import { IconSearch, IconX } from "@tabler/icons-react";
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

  // 过滤笔记列表
  const filteredNotes = noteList.filter((note) =>
    note.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Button mb="lg" variant="gradient" component={Link} href="/login">
          去登录
        </Button>
      </Center>
    );
  }
  if (loading) {
    return (
      <Stack align="center" justify="center" h={200}>
        <Text size="lg" c="dimmed">
          加载中...
        </Text>
      </Stack>
    );
  }

  if (!noteList.length) {
    return (
      <Stack align="center" justify="center" h={200}>
        <Text size="lg" c="dimmed">
          暂无笔记
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md" p="md">
      {/* 搜索框 */}
      <TextInput
        placeholder="搜索笔记名称..."
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
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
      />

      <Group justify="space-between" align="center">
        <Badge variant="light" size="lg">
          {searchQuery
            ? `${filteredNotes.length} / ${noteList.length}`
            : `${noteList.length}`}{" "}
          个笔记
        </Badge>
      </Group>

      {/* 搜索结果为空时的提示 */}
      {searchQuery && filteredNotes.length === 0 ? (
        <Stack align="center" justify="center" h={200}>
          <Text size="lg" c="dimmed">
            未找到匹配的笔记
          </Text>
          <Text size="sm" c="dimmed">
            尝试使用其他关键词搜索
          </Text>
        </Stack>
      ) : (
        <Grid gutter="md">
          {filteredNotes.map((note) => (
            <Grid.Col key={note.name}>
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
                    lineClamp={2}
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
      )}
    </Stack>
  );
}
