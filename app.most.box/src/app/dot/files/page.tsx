"use client";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  Box,
  Text,
  Group,
  Stack,
  Paper,
  Button,
  ActionIcon,
} from "@mantine/core";
import { api } from "@/constants/api";
import "./files.scss";
import Link from "next/link";

interface FileItem {
  name: string;
  type: "file" | "directory";
  size: number;
  cid: {
    "/": string;
  };
}

export default function PageDotFiles() {
  const [fileList, setFileList] = useState<FileItem[]>([]);

  const fetchFiles = async () => {
    try {
      const res = await api.post("/files/");
      setFileList(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleViewFile = (cid: string) => {
    const url = `https://cid.most.red/ipfs/${cid}/`;
    window.open(url, "_blank");
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <Box id="page-dot-files">
      <AppHeader title="文件列表" />
      <Stack gap="md" p="md">
        {fileList.map((item, index) => (
          <Paper key={index} p="md" withBorder radius="md">
            <Group justify="space-between" align="center">
              <Group align="center">
                <Text size="lg">{item.type === "directory" ? "📁" : "📄"}</Text>
                <Stack gap={4}>
                  <Text fw={500}>{item.name}</Text>
                  <Text size="sm" c="dimmed">
                    CID: {item.cid["/"]}
                  </Text>
                </Stack>
              </Group>
              <Group align="center">
                <Stack gap={4} align="flex-end">
                  {item.size > 0 && (
                    <Text size="sm" c="dimmed">
                      {formatFileSize(item.size)}
                    </Text>
                  )}
                </Stack>

                <ActionIcon
                  variant="subtle"
                  color="gray"
                  component={Link}
                  href={`https://cid.most.red/ipfs/${item.cid["/"]}?filename=${item.name}`}
                  target="_blank"
                >
                  🔍
                </ActionIcon>
              </Group>
            </Group>
          </Paper>
        ))}
        {fileList.length === 0 && (
          <Text ta="center" c="dimmed">
            暂无文件
          </Text>
        )}
      </Stack>
    </Box>
  );
}
