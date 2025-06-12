"use client";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Box, TextInput, Button, Group, Stack } from "@mantine/core";
import { api } from "@/constants/api";
import "./dot.scss";
import Link from "next/link";
import { IconWorldWww } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

export default function PageDot() {
  const [loading, setLoading] = useState(false);
  const [IPv6List, setIPv6List] = useState<string[]>([]);
  const [apiBaseUrl, setApiBaseUrl] = useState(api.defaults.baseURL);

  const fetchIpv6 = async (first = false) => {
    try {
      const res = await api(apiBaseUrl + "/ipv6");
      if (Array.isArray(res.data)) {
        setIPv6List(res.data);
      }
      if (!first) {
        api.defaults.baseURL = apiBaseUrl;
        notifications.show({
          title: "节点已切换",
          message: apiBaseUrl,
          color: "green",
        });
      }
    } catch (error) {
      notifications.show({
        title: "节点未切换",
        message: apiBaseUrl,
        color: "red",
      });
      console.error(error);
      setApiBaseUrl(api.defaults.baseURL);
    }
  };

  const handleApiUrlChange = async () => {
    setLoading(true);
    await fetchIpv6();
    setLoading(false);
  };

  useEffect(() => {
    fetchIpv6(true);
  }, []);

  return (
    <Box id="page-dot">
      <AppHeader title="DOT.MOST.BOX" />
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
            value={apiBaseUrl}
            onChange={(event) => setApiBaseUrl(event.currentTarget.value)}
            placeholder="输入节点地址"
          />
          <Button onClick={handleApiUrlChange} loading={loading}>
            更新
          </Button>
        </Group>
      </div>
    </Box>
  );
}
