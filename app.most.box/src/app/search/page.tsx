"use client";
import { AppHeader } from "@/components/AppHeader";
import { Box, Center, Space, Text } from "@mantine/core";
import { useEffect, useState } from "react";

export default function UpdatePage() {
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setKeyword(query.get("q") || "");
  }, []);

  return (
    <Box>
      <AppHeader title="搜索" />
      <Center>
        <Text size="lg">Search</Text>
        <Space w={10}></Space>
        <Text c="dimmed">{keyword}</Text>
      </Center>
    </Box>
  );
}
