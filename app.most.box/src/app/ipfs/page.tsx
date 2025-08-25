"use client";

import { AppHeader } from "@/components/AppHeader";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Box, Image, Text, Stack, Paper, Center, Flex } from "@mantine/core";

// 根据文件后缀名判断文件类型
function getFileType(
  filename: string | null
): "image" | "video" | "audio" | "unknown" {
  if (!filename) return "unknown";

  const extension = filename.toLowerCase().split(".").pop();

  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"];
  const videoExtensions = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"];
  const audioExtensions = ["mp3", "wav", "flac", "aac", "ogg", "m4a"];

  if (imageExtensions.includes(extension || "")) return "image";
  if (videoExtensions.includes(extension || "")) return "video";
  if (audioExtensions.includes(extension || "")) return "audio";

  return "unknown";
}

// 渲染文件预览组件
function FilePreview({
  cid,
  filename,
}: {
  cid: string | null;
  filename: string | null;
}) {
  if (!cid || !filename) return null;

  const fileType = getFileType(filename);
  const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;

  switch (fileType) {
    case "image":
      return (
        <Box mt="md">
          <Text size="sm" c="dimmed" mb="xs">
            图片预览:
          </Text>
          <Image
            src={ipfsUrl}
            alt={filename}
            style={{ maxWidth: "100%", maxHeight: "400px" }}
            fit="contain"
          />
        </Box>
      );

    case "video":
      return (
        <Box mt="md">
          <Text size="sm" c="dimmed" mb="xs">
            视频预览:
          </Text>
          <video
            controls
            style={{ maxWidth: "100%", maxHeight: "400px" }}
            preload="metadata"
          >
            <source src={ipfsUrl} />
            您的浏览器不支持视频播放。
          </video>
        </Box>
      );

    case "audio":
      return (
        <Box mt="md">
          <Text size="sm" c="dimmed" mb="xs">
            音频预览:
          </Text>
          <audio controls style={{ width: "100%" }}>
            <source src={ipfsUrl} />
            您的浏览器不支持音频播放。
          </audio>
        </Box>
      );

    default:
      return (
        <Box mt="md">
          <Text size="sm" c="dimmed">
            文件类型: {filename.split(".").pop()?.toUpperCase() || "未知"}
          </Text>
          <Text size="xs" c="dimmed">
            此文件类型暂不支持预览
          </Text>
        </Box>
      );
  }
}

export default function PageIPFS() {
  const searchParams = useSearchParams();
  const cid = searchParams.get("cid");
  const filename = searchParams.get("filename");

  const title = `${cid}?filename=${filename}`;

  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setShareUrl(
      `${window.location.origin}/ipfs/${title}${window.location.hash}`
    );
  }, []);

  return (
    <Suspense>
      <AppHeader title={title}></AppHeader>
      <Stack gap="md" p="md">
        <Box>
          <Text size="sm" c="dimmed" mb="xs">
            文件信息:
          </Text>
          <Text size="sm">CID: {cid}</Text>
          <Text size="sm">文件名: {filename}</Text>
        </Box>

        <FilePreview cid={cid} filename={filename} />

        <Box>
          <Text size="sm" c="dimmed" mb="xs">
            CID 二维码:
          </Text>
          <Flex>
            <Paper
              radius="md"
              p={10}
              withBorder
              style={{ display: "flex", backgroundColor: "white" }}
            >
              <QRCodeSVG
                value={shareUrl}
                size={180}
                bgColor="white"
                fgColor="#333"
                level="M"
              />
            </Paper>
          </Flex>
        </Box>

        <Box>
          <Text size="sm" c="dimmed" mb="xs">
            分享链接:
          </Text>
          <Text size="xs" style={{ wordBreak: "break-all" }}>
            {shareUrl}
          </Text>
        </Box>
      </Stack>
    </Suspense>
  );
}
