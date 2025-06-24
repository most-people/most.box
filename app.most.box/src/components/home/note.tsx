import { Text, Grid, Card, Group, Badge, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import "./note.scss";
import { api } from "@/constants/api";
import { useUserStore } from "@/stores/userStore";

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

  const fetchNodes = async () => {
    try {
      setLoading(true);
      const res = await api.post("/files/.note");
      console.log(res.data);
      setNoteList(res.data || []);
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
      <Group justify="space-between" align="center">
        <Badge variant="light" size="lg">
          {noteList.length} 个笔记
        </Badge>
      </Group>

      <Grid gutter="md">
        {noteList.map((note) => (
          <Grid.Col key={note.name} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
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
    </Stack>
  );
}
