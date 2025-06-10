"use client";

import { ActionIcon, Group, useMantineColorScheme } from "@mantine/core";
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";
import { useEffect, useState } from "react";

export function ThemeSwitcher() {
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
  );
}
