"use client";

import { AppHeader } from "@/components/AppHeader";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Box, Text, Stack, Paper, Flex, Anchor } from "@mantine/core";
import Link from "next/link";
import { useUserStore } from "@/stores/userStore";

const PageContent = () => {
  const params = useSearchParams();
  const cid = params.get("cid");
  const filename = params.get("filename");
  const dotCID = useUserStore((state) => state.dotCID);
  const dotAPI = useUserStore((state) => state.dotAPI);

  const shareUrl = useMemo(() => {
    if (dotAPI) {
      const url = new URL(location.origin);
      url.pathname = `/ipfs/${cid}`;
      if (filename) {
        url.searchParams.set("filename", filename);
      }
      try {
        url.hash = new URL(dotAPI).host;
      } catch {}
      return url.href;
    }
    return "";
  }, [dotAPI]);

  const downloadUrl = useMemo(() => {
    if (dotCID) {
      const url = new URL(dotCID);
      url.pathname = `/ipfs/${cid}`;
      if (filename) {
        url.searchParams.set("filename", filename);
      }

      return url.href;
    }
    return "";
  }, [dotCID]);

  return (
    <Suspense>
      <AppHeader title="IPFS 内容寻址"></AppHeader>
      <Stack gap="md" p="md">
        <Box>
          <Text c="dimmed">文件信息</Text>
          <Text>文件名：{filename || "无"}</Text>
          <Text>CID：{cid}</Text>
        </Box>

        <Box>
          <Text c="dimmed">分享本页</Text>
          <Anchor component={Link} href={shareUrl} target="_blank">
            <Text>{shareUrl}</Text>
          </Anchor>

          {shareUrl && (
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
          )}
        </Box>

        <Box>
          <Text c="dimmed">预览下载</Text>
          <Anchor component={Link} href={downloadUrl} target="_blank">
            <Text>{downloadUrl}</Text>
          </Anchor>
        </Box>
      </Stack>
    </Suspense>
  );
};

export default function PageIPFS() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}
