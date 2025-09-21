"use client";

import { AppHeader } from "@/components/AppHeader";
import { ActionIcon, Group, useMantineColorScheme } from "@mantine/core";
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Text, Container, Stack } from "@mantine/core";

const ThemeSwitcher = () => {
  const { setColorScheme, colorScheme } = useMantineColorScheme();

  const [mounted, setMounted] = useState(false);
  // 只在客户端渲染后显示组件
  useEffect(() => {
    setMounted(true);
  }, []);

  // 在服务器端或客户端首次渲染时返回null，避免hydration不匹配
  if (!mounted) {
    return null;
  }

  return (
    <Stack gap="xs">
      <Text>主题</Text>
      <Group gap="xs">
        <ActionIcon
          onClick={() => setColorScheme("auto")}
          variant={colorScheme === "auto" ? "filled" : "default"}
          size="lg"
          aria-label="跟随系统"
        >
          <IconDeviceDesktop size={18} />
        </ActionIcon>

        <ActionIcon
          onClick={() => setColorScheme("light")}
          variant={colorScheme === "light" ? "filled" : "default"}
          size="lg"
          aria-label="亮色主题"
          color={colorScheme === "light" ? "yellow" : "gray"}
        >
          <IconSun size={18} />
        </ActionIcon>

        <ActionIcon
          onClick={() => setColorScheme("dark")}
          variant={colorScheme === "dark" ? "filled" : "default"}
          size="lg"
          aria-label="暗色主题"
          color={colorScheme === "dark" ? "blue" : "gray"}
        >
          <IconMoon size={18} />
        </ActionIcon>
      </Group>
    </Stack>
  );
};

export default function PageSetting() {
  return (
    <Container py={20}>
      <AppHeader title="设置" />
      <Stack gap={20}>
        <ThemeSwitcher />
      </Stack>
    </Container>
  );
}
