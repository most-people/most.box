"use client";

import { useEffect, useState } from "react";
import {
  Container,
  Title,
  Text,
  Paper,
  Loader,
  Center,
  Image,
} from "@mantine/core";
import { useHash } from "@mantine/hooks";

export default function NotePage() {
  const [hash] = useHash();
  const cid = hash.slice(1);
  const [loading, setLoading] = useState(true);
  const [noteData, setNoteData] = useState<any>(null);

  const fetchNote = () => {
    fetch(`https://cid.most.red/ipfs/${cid}/index.md`)
      .then((response) => response.text())
      .then((data) => {
        console.log("Markdown content:", data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  useEffect(() => {
    if (cid) {
      // 这里可以根据 cid 参数加载对应的笔记数据
      console.log("Note CID:", cid);
      fetchNote();

      // 模拟数据加载
      setTimeout(() => {
        setNoteData({
          id: cid,
          title: `笔记 ${cid}`,
          content: "这是笔记内容...",
          createdAt: new Date().toISOString(),
        });
        setLoading(false);
      }, 1000);
    }
  }, [cid]);

  if (loading) {
    return (
      <Center h={200}>
        <Loader size="md" />
      </Center>
    );
  }

  return (
    <Container size="md" py="xl">
      <Paper shadow="sm" p="md" radius="md">
        <Title order={1} mb="md">
          {noteData?.title || "笔记详情"}
        </Title>

        <Text size="sm" c="dimmed" mb="lg">
          CID: {cid}
        </Text>

        <Image
          src="https://cid.most.red/ipfs/QmYS521g2zomKqvfuZjZhmbcTEn6ZjMYim7yRq6kebhC8Y"
          alt="笔记图片"
          mb="lg"
        />

        <Text>{noteData?.content || "暂无内容"}</Text>

        {noteData?.createdAt && (
          <Text size="xs" c="dimmed" mt="md">
            创建时间: {new Date(noteData.createdAt).toLocaleString()}
          </Text>
        )}
      </Paper>
    </Container>
  );
}
