"use client";

import { AppHeader } from "@/components/AppHeader";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Text,
  Stack,
  Group,
  Title,
  CopyButton,
  ActionIcon,
  Alert,
  TextInput,
  Tooltip,
  Button,
  Center,
  Box,
} from "@mantine/core";
import Link from "next/link";
import { IconCopy, IconInfoCircle } from "@tabler/icons-react";
import { useDotStore } from "@/stores/dotStore";
import "./ipfs.scss";

type CidType = "dir" | "note" | "file";

const PageContent = () => {
  const pathname = usePathname();
  const params = useSearchParams();
  const cidType = (params.get("type") || "file") as CidType;
  const cid = pathname.split("/")[2] || "";
  const initFilename = params.get("filename") || "";
  const [filename, setFilename] = useState<string>(initFilename);
  const dotCID = useDotStore((state) => state.dotCID);
  const dotAPI = useDotStore((state) => state.dotAPI);

  const shareUrl = useMemo(() => {
    if (dotAPI && cid) {
      const url = new URL(location.origin);
      url.pathname = `/ipfs/${cid}`;
      if (filename) {
        url.searchParams.set("filename", filename);
        url.searchParams.set("type", cidType);
      }
      return url.href;
    }
    return "";
  }, [dotAPI, cid, filename, cidType]);

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
        if (cidType === "dir" || cidType === "note") {
          url.searchParams.set("format", "tar");
          url.searchParams.set("filename", `${filename}.tar`);
        } else {
          url.searchParams.set("filename", filename);
        }
      }
      return url.href;
    }
    return "";
  }, [dotCID, cid, filename, cidType]);

  const host = `https://most.box/${pathname.split("/")[1]}/`;

  return (
    <Box id="page-ipfs">
      <AppHeader title={filename || cid || "CID"} />
      <Stack gap="lg">
        {!cid && (
          <Alert icon={<IconInfoCircle size={18} />} color="orange" radius="md">
            未提供 CID，请通过带有 cid 的链接访问本页。
          </Alert>
        )}

        <Group justify="space-between" align="center">
          <Group gap={8}>
            {cidType === "dir" ? "📁" : "📄"}
            <Title order={4}>{cidType === "dir" ? "文件夹" : "文件"}信息</Title>
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
            label={cidType === "dir" ? "文件夹" : "文件名"}
            placeholder={cidType === "dir" ? "文件夹" : "文件名"}
            value={filename}
            onChange={(e) => setFilename(e.currentTarget.value)}
          />
        </Stack>

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
                <Tooltip label={copied ? "已复制" : "复制链接"} position="top">
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
            color="green"
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

        {cidType === "note" && (
          <Button
            variant="light"
            w="100%"
            component={Link}
            href={`/note/?cid=${cid}&name=${filename}`}
            target="_blank"
          >
            打开笔记
          </Button>
        )}

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
                <Tooltip label={copied ? "已复制" : "复制链接"} position="top">
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
        <Center>
          <div className="ipfs-qrcode">
            <div className="qrcode-frame">
              <QRCodeSVG
                className="qrcode"
                value={`${host}/${cid}`}
                size={138}
                bgColor="transparent"
                fgColor="#ffffff"
              />
            </div>
            <div className="line"></div>

            <div className="info">
              <div className="name">{filename}</div>
              <div className="host">{host}</div>
              <div className="ipns">{cid}</div>
            </div>
          </div>
        </Center>
      </Stack>
    </Box>
  );
};
export default function PageIPFS() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}
