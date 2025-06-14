"use client";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Box, TextInput, Button, Group, Stack } from "@mantine/core";
import "./dot.scss";
import Link from "next/link";
import { IconWorldWww } from "@tabler/icons-react";
import { useUserStore } from "@/stores/userStore";

export default function PageDot() {
  const [apiLoading, setApiLoading] = useState(false);
  const [IPv6List, setIPv6List] = useState<string[]>([]);
  const dotAPI = useUserStore((state) => state.dotAPI);
  const setItem = useUserStore((state) => state.setItem);
  const updateDot = useUserStore((state) => state.updateDot);

  const handleApiUrlChange = async () => {
    setApiLoading(true);
    const list = await updateDot(dotAPI);
    if (list) {
      setIPv6List(list);
    }
    setApiLoading(false);
  };

  return (
    <Box id="page-dot">
      <AppHeader title="确认节点" />
      <div className="container">
        <div className="emoji">🎉</div>
        <h1>DOT.MOST.BOX</h1>
        {IPv6List.length > 0 && (
          <>
            <p>节点已成功运行</p>
            <Stack justify="center">
              {IPv6List.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {url}
                </a>
              ))}
            </Stack>
          </>
        )}
        <p>為 全 人 類 徹 底 解 放 奮 鬥 終 身</p>

        <Link href="/dot/files">查看我的文件</Link>

        <Group mt="sm" justify="center">
          <TextInput
            leftSection={<IconWorldWww />}
            value={dotAPI}
            onChange={(event) => setItem("dotAPI", event.currentTarget.value)}
            placeholder="输入节点地址"
          />
          <Button onClick={handleApiUrlChange} loading={apiLoading}>
            更新
          </Button>
        </Group>
      </div>
    </Box>
  );
}
