"use client";

import { AppHeader } from "@/components/AppHeader";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Box, Text, Stack, Paper, Flex } from "@mantine/core";

export default function PageIPFS() {
  const searchParams = useSearchParams();
  const cid = searchParams.get("cid");
  const filename = searchParams.get("filename");

  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    const url = new URL(location.origin);
    url.pathname = `/ipfs/${cid}`;
    if (filename) {
      url.searchParams.set("filename", filename);
      url.hash = location.hash;
    }
    setShareUrl(url.href);
  }, []);

  return (
    <Suspense>
      <AppHeader title={filename || "IPFS"}></AppHeader>
      <Stack gap="md" p="md">
        <Stack>
          <Text c="dimmed">文件信息:</Text>
          <Text>文件名: {filename}</Text>
          <Text>CID: {cid}</Text>
        </Stack>

        {shareUrl && (
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
                  level="L"
                />
              </Paper>
            </Flex>
          </Box>
        )}

        <Box>
          <Text c="dimmed" mb="xs">
            分享链接:
          </Text>
          <Text style={{ wordBreak: "break-all" }}>{shareUrl}</Text>
        </Box>
      </Stack>
    </Suspense>
  );
}
