"use client";

import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import mp from "@/constants/mp";
import {
  Avatar,
  Container,
  Paper,
  Stack,
  Text,
  Group,
  ActionIcon,
  Tooltip,
  Box,
} from "@mantine/core";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { notifications } from "@mantine/notifications";
import { IconCopy, IconShare } from "@tabler/icons-react";

const PageContent = () => {
  const params = useSearchParams();
  const uid = params.get("uid") || mp.ZeroAddress;

  const shareUrl = `https://most.box/card?uid=${uid}`;
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(uid);
      notifications.show({
        title: "复制成功",
        message: uid,
        color: "green",
      });
    } catch {
      notifications.show({
        title: "复制失败",
        message: "无法复制到剪贴板",
        color: "red",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Most.Box 名片",
          text: shareUrl,
          url: shareUrl,
        });
      } catch {
        // 用户取消分享或分享失败，回退到复制链接
        handleCopyShareLink(shareUrl);
      }
    } else {
      // 浏览器不支持 Web Share API，回退到复制链接
      handleCopyShareLink(shareUrl);
    }
  };

  const handleCopyShareLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notifications.show({
        title: "链接已复制",
        message: "分享链接已复制到剪贴板",
        color: "blue",
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Container py="lg" size="sm">
      <AppHeader title="名片" />

      <Stack align="center" gap="xl">
        <Avatar
          size={100}
          radius="lg"
          src={mp.avatar(uid)}
          alt="头像"
          style={{
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
          }}
        />

        <Stack align="center" gap="md">
          <Text size="sm" c="dimmed" fw={500}>
            我的名片
          </Text>

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

          <Text size="xs" c="dimmed" ta="center">
            扫描二维码查看
          </Text>
        </Stack>

        <Group gap="md" justify="center">
          <Tooltip label="复制名片">
            <ActionIcon
              size="xl"
              radius="xl"
              variant="light"
              color="blue"
              onClick={handleCopyAddress}
            >
              <IconCopy size={20} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="分享名片">
            <ActionIcon
              size="xl"
              radius="xl"
              variant="light"
              color="green"
              onClick={handleShare}
            >
              <IconShare size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* 底部装饰 */}
        <Box mt="xl">
          <Text size="xs" c="dimmed" ta="center">
            Powered by Most.Box
          </Text>
        </Box>
      </Stack>
    </Container>
  );
};

export default function PageCard() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}
