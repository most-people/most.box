"use client";

import { AppHeader } from "@/components/AppHeader";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Text,
  Stack,
  Paper,
  Flex,
  Container,
  Group,
  Title,
  CopyButton,
  ActionIcon,
  Alert,
  TextInput,
  Tooltip,
  Button,
} from "@mantine/core";
import Link from "next/link";
import { useUserStore } from "@/stores/userStore";
import { IconCopy, IconQrcode, IconInfoCircle } from "@tabler/icons-react";

const PageContent = () => {
  const params = useSearchParams();
  const isDir = params.get("type") === "dir";
  const cid = params.get("cid") || "";
  const initFilename = params.get("filename") || "";
  const [filename, setFilename] = useState<string>(initFilename);
  const dotCID = useUserStore((state) => state.dotCID);
  const dotAPI = useUserStore((state) => state.dotAPI);

  const shareUrl = useMemo(() => {
    if (dotAPI && cid) {
      const url = new URL(location.origin);
      url.pathname = `/ipfs/`;
      url.searchParams.set("cid", cid);
      if (filename) {
        url.searchParams.set("filename", filename);
      }
      try {
        url.hash = new URL(dotAPI).host;
      } catch {}
      return url.href;
    }
    return "";
  }, [dotAPI, cid, filename]);

  const previewUrl = useMemo(() => {
    if (dotCID && cid) {
      const url = new URL(dotCID);
      url.pathname = `/ipfs/${cid}`;
      if (filename) {
        url.searchParams.set("filename", filename);
      }
      return url.href;
    }
    return "";
  }, [dotCID, cid, filename]);

  const downloadUrl = useMemo(() => {
    if (dotCID && cid) {
      const url = new URL(dotCID);
      url.pathname = `/ipfs/${cid}`;
      url.searchParams.set("download", "true");
      if (filename) {
        if (isDir) {
          url.searchParams.set("format", "tar");
          url.searchParams.set("filename", `${filename}.tar`);
        } else {
          url.searchParams.set("filename", filename);
        }
      }
      return url.href;
    }
    return "";
  }, [dotCID, cid, filename, isDir]);

  return (
    <Suspense>
      <AppHeader title={filename || cid || "CID"} />
      <Container size="sm" p="md" w="100%">
        <Stack gap="lg">
          {!cid && (
            <Alert
              icon={<IconInfoCircle size={18} />}
              color="orange"
              radius="md"
            >
              未提供 CID，请通过带有 ?cid= 的链接访问本页。
            </Alert>
          )}

          <Group justify="space-between" align="center">
            <Group gap={8}>
              {isDir ? "📁" : "📄"}
              <Title order={4}>{isDir ? "文件夹" : "文件"}信息</Title>
            </Group>
            {initFilename && (
              <Text size="sm" c="dimmed">
                {initFilename}
              </Text>
            )}
          </Group>

          <Stack>
            <TextInput
              radius="md"
              label="CID"
              placeholder="请输入 CID"
              value={cid}
              readOnly
              variant="filled"
            />
            <TextInput
              radius="md"
              label={isDir ? "文件夹" : "文件名"}
              placeholder={isDir ? "文件夹" : "文件名"}
              value={filename}
              onChange={(e) => setFilename(e.currentTarget.value)}
            />
          </Stack>

          <Group justify="space-between">
            <Group gap={8}>
              📤
              <Title order={4}>分享本页</Title>
            </Group>
          </Group>

          {!dotAPI && (
            <Alert color="gray" radius="md" mb="sm">
              未设置 Dot API，分享链接将不可用。
            </Alert>
          )}

          <TextInput
            radius="md"
            value={shareUrl || ""}
            readOnly
            variant="filled"
            disabled={!shareUrl}
            placeholder="无可用链接"
            rightSection={
              <CopyButton value={shareUrl || ""}>
                {({ copied, copy }) => (
                  <Tooltip
                    label={copied ? "已复制" : "复制链接"}
                    position="top"
                  >
                    <ActionIcon
                      variant="subtle"
                      color={copied ? "teal" : "gray"}
                      onClick={copy}
                      disabled={!shareUrl}
                    >
                      <IconCopy size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            }
          />

          {shareUrl && (
            <Flex justify="center">
              <Paper
                radius="md"
                p={12}
                withBorder
                style={{ backgroundColor: "white" }}
              >
                <Stack gap={9}>
                  <Group justify="center" gap={6}>
                    <IconQrcode size={18} />
                    <Text size="sm" c="dimmed">
                      扫码快速分享
                    </Text>
                    <IconQrcode size={18} />
                  </Group>
                  <QRCodeSVG
                    value={shareUrl}
                    size={200}
                    bgColor="white"
                    fgColor="#333"
                    level="M"
                  />
                </Stack>
              </Paper>
            </Flex>
          )}

          <Group justify="space-between">
            <Group gap={8}>
              📖
              <Title order={4}>查看 / 下载</Title>
            </Group>
          </Group>

          {!dotCID && (
            <Alert color="gray" radius="md" mb="sm">
              未连接到 Dot 节点，下载链接将不可用。
            </Alert>
          )}

          <TextInput
            radius="md"
            value={previewUrl || ""}
            readOnly
            variant="filled"
            disabled={!previewUrl}
            placeholder="无可用链接"
            rightSection={
              <CopyButton value={previewUrl || ""}>
                {({ copied, copy }) => (
                  <Tooltip
                    label={copied ? "已复制" : "复制链接"}
                    position="top"
                  >
                    <ActionIcon
                      variant="subtle"
                      color={copied ? "teal" : "gray"}
                      onClick={copy}
                      disabled={!previewUrl}
                    >
                      <IconCopy size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            }
          />

          <Group wrap="nowrap">
            <Button
              variant="light"
              w="100%"
              component={Link}
              target="_blank"
              href={previewUrl}
            >
              查看
            </Button>
            {filename ? (
              <Button
                variant="light"
                color="blue"
                w="100%"
                component={Link}
                target="_blank"
                href={downloadUrl}
              >
                下载
              </Button>
            ) : (
              <Button variant="light" color="blue" w="100%" disabled>
                下载
              </Button>
            )}
          </Group>
        </Stack>
      </Container>
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
