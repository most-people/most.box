"use client";

import { AppHeader } from "@/components/AppHeader";
import {
  Container,
  Stack,
  Textarea,
  Button,
  Text,
  Alert,
  Box,
  PasswordInput,
  Group,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { mostEncode, mostDecode, mostWallet } from "@/constants/MostWallet";
import { notifications } from "@mantine/notifications";
import { IconInfoCircle, IconCopy } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";

export default function PageMpMi() {
  const [password, setPassword] = useState("");
  const [plaintext, setPlaintext] = useState("");
  const [cipherText, setCipherText] = useState("");
  const [visible, { toggle }] = useDisclosure(true);

  const username = "most.box/mp/mi";

  const handleCopyPlaintext = async () => {
    if (!plaintext.trim()) {
      notifications.show({
        message: "没有可复制的明文内容",
        color: "orange",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(plaintext);
      notifications.show({
        title: "成功",
        message: "明文已复制到剪贴板",
        color: "green",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopyLink = async () => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set("mi", cipherText);
    const shareUrl = url.href;

    try {
      await navigator.clipboard.writeText(shareUrl);
      notifications.show({
        title: "成功",
        message: "网址已复制到剪贴板",
        color: "green",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleEncrypt = () => {
    if (!password.trim()) {
      notifications.show({
        message: "请输入密码",
        color: "orange",
      });
      return;
    }

    try {
      // 使用密码生成密钥对
      const wallet = mostWallet(username, password);
      const encrypted = mostEncode(
        plaintext,
        wallet.public_key,
        wallet.private_key
      );

      if (encrypted) {
        setCipherText(encrypted);

        const url = new URL(window.location.href);
        url.searchParams.set("mi", encrypted);
        window.history.replaceState({}, "", url.href);

        notifications.show({
          title: "成功",
          message: "加密完成",
          color: "green",
        });
      } else {
        notifications.show({
          title: "错误",
          message: "加密失败",
          color: "red",
        });
      }
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "错误",
        message: "加密过程中发生错误",
        color: "red",
      });
    }
  };

  const handleDecrypt = () => {
    if (!password.trim()) {
      notifications.show({
        message: "请输入密码",
        color: "orange",
      });
      return;
    }

    try {
      // 使用密码生成密钥对
      const wallet = mostWallet(username, password);
      const decrypted = mostDecode(
        cipherText,
        wallet.public_key,
        wallet.private_key
      );

      if (decrypted) {
        setPlaintext(decrypted);
        notifications.show({
          title: "成功",
          message: "解密完成",
          color: "green",
        });
      } else {
        notifications.show({
          title: "错误",
          message: "解密失败，请检查密码或密文是否正确",
          color: "red",
        });
      }
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "错误",
        message: "解密过程中发生错误",
        color: "red",
      });
    }
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const mi = url.searchParams.get("mi");
    if (mi) {
      setCipherText(mi);
    }
  }, []);

  return (
    <Container maw={600} w="100%">
      <AppHeader title="加密 / 解密" />

      <Stack gap="md" mt="md">
        <Alert icon={<IconInfoCircle size={16} />}>
          使用 X25519 加密算法对文本进行加密和解密
        </Alert>

        <Box>
          <Text size="sm" fw={500} mb={5}>
            密码
          </Text>

          <PasswordInput
            autoFocus
            placeholder="请输入密码"
            visible={visible}
            onVisibilityChange={toggle}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />
        </Box>

        <Box>
          <Text size="sm" fw={500} mb={5}>
            密文
          </Text>
          <Textarea
            placeholder="加密后的文本将显示在这里"
            value={cipherText}
            onChange={(event) => setCipherText(event.currentTarget.value)}
            minRows={4}
            autosize
          />
        </Box>

        <Group grow>
          <Button onClick={handleDecrypt} disabled={!cipherText}>
            解密
          </Button>
          <Button
            variant="light"
            color="blue"
            onClick={handleCopyLink}
            disabled={!cipherText}
            leftSection={<IconCopy size={16} />}
          >
            复制网址
          </Button>
        </Group>

        <Box>
          <Text size="sm" fw={500} mb={5}>
            明文
          </Text>
          <Textarea
            placeholder="请输入要加密的文本"
            value={plaintext}
            onChange={(event) => setPlaintext(event.currentTarget.value)}
            minRows={4}
            autosize
          />
        </Box>

        <Group grow>
          <Button onClick={handleEncrypt} disabled={!plaintext} color="orange">
            加密
          </Button>
          <Button
            variant="light"
            color="green"
            onClick={handleCopyPlaintext}
            disabled={!plaintext.trim()}
            leftSection={<IconCopy size={16} />}
          >
            复制
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}
