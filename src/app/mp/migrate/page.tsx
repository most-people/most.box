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
  Box,
  Alert,
} from "@mantine/core";
import { useState } from "react";
import {
  mostWallet,
  most25519,
  mostDecodeMessage,
  mostEncode,
} from "@/utils/MostWallet";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconFileUpload,
} from "@tabler/icons-react";
import dayjs from "dayjs";

export default function PageMigrate() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [backupContent, setBackupContent] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setBackupContent(text);
  };

  const handleMigrate = async () => {
    if (!username || !password || !backupContent) {
      notifications.show({
        message: "请填写完整信息并上传备份文件",
        color: "red",
      });
      return;
    }

    setProcessing(true);
    try {
      // 1. 生成密钥
      const { danger } = mostWallet(username, password);
      const { public_key, private_key } = most25519(danger);

      // 2. 解密备份文件
      let data: any;
      if (backupContent.startsWith("mp://2")) {
        const decryptedBackup = mostDecodeMessage(
          backupContent,
          public_key,
          private_key,
        );
        if (!decryptedBackup)
          throw new Error("备份文件解密失败，请检查账号密码");
        data = JSON.parse(decryptedBackup);
      } else {
        // 假设是明文或其他格式，尝试直接解析
        try {
          data = JSON.parse(backupContent);
        } catch (e) {
          throw new Error("无效的备份文件格式");
        }
      }

      // 3. 处理笔记内容
      if (data.notes && Array.isArray(data.notes)) {
        let convertedCount = 0;
        data.notes = data.notes.map((note: any) => {
          if (note.content && note.content.startsWith("mp://2")) {
            const decryptedNote = mostDecodeMessage(
              note.content,
              public_key,
              private_key,
            );
            if (decryptedNote) {
              // 重新加密为 mp://1
              note.content = mostEncode(decryptedNote, danger);
              convertedCount++;
            } else {
              console.error(`笔记 ${note.name} 解密失败`);
            }
          }
          return note;
        });
        notifications.show({
          message: `成功转换 ${convertedCount} 篇笔记`,
          color: "blue",
        });
      }

      // 4. 重新打包并加密整个备份
      const newBackupContent = mostEncode(JSON.stringify(data), danger);

      // 5. 触发下载
      const blob = new Blob([newBackupContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${username.split("/").pop()}-migrated-${dayjs().format(
        "YYYY-MM-DD",
      )}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      notifications.show({
        title: "迁移成功",
        message: "新备份文件已下载，请使用新文件恢复数据",
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
      <AppHeader title="数据迁移" />

      <Stack gap="md" mt="xl">
        <Alert>
          此工具用于将旧版加密格式 (mp://2) 的备份文件转换为新版格式 (mp://1)。
          请输入您原有的用户名和密码以解密旧数据。
        </Alert>

        <TextInput
          label="用户名"
          placeholder="请输入用户名"
          value={username}
          onChange={(e) => setUsername(e.currentTarget.value)}
          required
        />

        <PasswordInput
          label="密码"
          placeholder="请输入密码"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
        />

        <FileInput
          label="导入旧备份文件"
          placeholder="点击上传 .txt 备份文件"
          accept=".txt"
          leftSection={<IconFileUpload size={18} />}
          onChange={handleFileUpload}
          clearable
        />

        <Textarea
          label="或直接粘贴备份内容"
          placeholder="mp://2..."
          value={backupContent}
          onChange={(e) => setBackupContent(e.currentTarget.value)}
          minRows={4}
          maxRows={10}
          autosize
        />

        <Button onClick={handleMigrate} loading={processing} fullWidth mt="md">
          开始转换并下载
        </Button>
      </Stack>
    </Container>
  );
}
