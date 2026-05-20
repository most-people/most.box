"use client";

import { AppHeader } from "@/components/AppHeader";
import {
  Button,
  Container,
  Group,
  PasswordInput,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  FileInput,
  Alert,
  Divider,
  Badge,
} from "@mantine/core";
import { useState } from "react";
import {
  mostWalletWithIterations,
  mostDecode,
  mostEncode,
} from "@/utils/MostWallet";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconFileUpload,
  IconUser,
  IconUserPlus,
} from "@tabler/icons-react";
import dayjs from "dayjs";

const OLD_ITERATIONS = 3;
const NEW_ITERATIONS = 50000;

export default function PageAccountMigrate() {
  const [oldUsername, setOldUsername] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [backupContent, setBackupContent] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setBackupContent(text);
  };

  const handleMigrate = async () => {
    if (!oldUsername || !oldPassword || !newUsername || !newPassword) {
      notifications.show({
        message: "请填写所有账户信息",
        color: "red",
      });
      return;
    }

    if (!backupContent) {
      notifications.show({
        message: "请上传备份文件或粘贴备份内容",
        color: "red",
      });
      return;
    }

    setProcessing(true);
    try {
      const oldWallet = mostWalletWithIterations(
        oldUsername,
        oldPassword,
        OLD_ITERATIONS,
      );
      const newWallet = mostWalletWithIterations(
        newUsername,
        newPassword,
        NEW_ITERATIONS,
      );

      let data: any;

      if (backupContent.startsWith("mp://1")) {
        const decryptedBackup = mostDecode(backupContent, oldWallet.danger);
        if (!decryptedBackup)
          throw new Error("旧备份文件解密失败，请检查旧账户用户名和密码");
        try {
          data = JSON.parse(decryptedBackup);
        } catch {
          throw new Error("备份数据解析失败，文件格式可能不正确");
        }
      } else {
        try {
          data = JSON.parse(backupContent);
        } catch {
          throw new Error(
            "无效的备份文件格式，请确保文件是以 mp://1 格式加密的备份",
          );
        }
      }

      let convertedCount = 0;
      let skippedCount = 0;

      if (data.notes && Array.isArray(data.notes)) {
        data.notes = data.notes.map((note: any) => {
          if (!note.content) return note;

          if (note.content.startsWith("mp://1")) {
            const decrypted = mostDecode(note.content, oldWallet.danger);
            if (decrypted) {
              note.content = mostEncode(decrypted, newWallet.danger);
              convertedCount++;
            } else {
              skippedCount++;
            }
          } else if (note.content.startsWith("mp://2")) {
            skippedCount++;
          }

          return note;
        });
      }

      const json = JSON.stringify(data);
      const encrypted = mostEncode(json, newWallet.danger);
      const blob = new Blob([encrypted], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${newUsername}-migrated-${dayjs().format("YYYY-MM-DD")}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      notifications.show({
        title: "迁移成功",
        message: `成功转换 ${convertedCount} 篇笔记${skippedCount > 0 ? `，${skippedCount} 篇跳过` : ""}`,
        color: "green",
        icon: <IconCheck size={18} />,
      });
    } catch (error: any) {
      console.error(error);
      notifications.show({
        title: "迁移失败",
        message: error.message || "未知错误",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Container maw={600} py="xl">
      <AppHeader title="账户迁移" />

      <Stack gap="lg" mt="xl">
        <Alert color="blue" variant="light">
          <Text size="sm">
            此工具用于将旧版迭代密钥（{OLD_ITERATIONS} 次
            PBKDF2）加密的数据迁移到新版账户（{NEW_ITERATIONS} 次迭代）。
            请先使用旧账户的用户名和密码解密数据，再提供新账户信息重新加密。
          </Text>
        </Alert>

        <Stack gap="md">
          <Group gap="xs" align="center">
            <IconUser size={20} />
            <Title order={4}>旧账户信息</Title>
            <Badge color="orange" variant="light" size="sm">
              {OLD_ITERATIONS} 次迭代
            </Badge>
          </Group>

          <TextInput
            label="用户名"
            placeholder="请输入旧账户用户名"
            value={oldUsername}
            onChange={(e) => setOldUsername(e.currentTarget.value)}
            required
          />

          <PasswordInput
            label="密码"
            placeholder="请输入旧账户密码"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.currentTarget.value)}
            required
          />
        </Stack>

        <Divider />

        <Stack gap="md">
          <Group gap="xs" align="center">
            <IconUserPlus size={20} />
            <Title order={4}>新账户信息</Title>
            <Badge color="blue" variant="light" size="sm">
              {NEW_ITERATIONS} 次迭代
            </Badge>
          </Group>

          <TextInput
            label="用户名"
            placeholder="请输入新账户用户名"
            value={newUsername}
            onChange={(e) => setNewUsername(e.currentTarget.value)}
            required
          />

          <PasswordInput
            label="密码"
            placeholder="请输入新账户密码"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
            required
          />
        </Stack>

        <Divider />

        <Stack gap="md">
          <Title order={5}>备份数据</Title>

          <FileInput
            label="上传旧备份文件"
            placeholder="点击上传 .txt 备份文件"
            accept=".txt"
            leftSection={<IconFileUpload size={18} />}
            onChange={handleFileUpload}
            clearable
          />

          <Textarea
            label="或直接粘贴备份内容"
            placeholder="mp://1..."
            value={backupContent}
            onChange={(e) => setBackupContent(e.currentTarget.value)}
            minRows={4}
            maxRows={10}
            autosize
          />
        </Stack>

        <Button
          onClick={handleMigrate}
          loading={processing}
          fullWidth
          size="md"
          mt="md"
        >
          开始转换并下载
        </Button>
      </Stack>
    </Container>
  );
}
