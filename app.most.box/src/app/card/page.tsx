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
} from "@mantine/core";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { notifications } from "@mantine/notifications";
import { IconCopy, IconShare } from "@tabler/icons-react";

const PageContent = () => {
  const params = useSearchParams();
  const uid = params.get("uid") || mp.ZeroAddress;

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
    const shareUrl = window.location.href;
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
      <AppHeader title="我的地址" />

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
          <Paper
            radius="md"
            p={10}
            withBorder
            style={{ display: "flex", backgroundColor: "white" }}
          >
            <Stack align="center" gap={4}>
              <Text size="sm" c="dimmed" fw={500}>
                {mp.formatAddress(uid)}
              </Text>

              <QRCodeSVG
                value={uid}
                size={180}
                bgColor="white"
                fgColor="#333"
                level="M"
              />
            </Stack>
          </Paper>

          <Text
            c="dimmed"
            ta="center"
            variant="gradient"
            gradient={{ from: "blue", to: "cyan", deg: 90 }}
          >
            {uid}
          </Text>
        </Stack>

        <Group gap="md" justify="center">
          <Tooltip label="复制地址">
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

          <Tooltip label="分享本页">
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

        <Text size="xs" c="dimmed" ta="center">
          Powered by Most.Box
        </Text>
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
