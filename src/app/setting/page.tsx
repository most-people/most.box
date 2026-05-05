"use client";

import { AppHeader } from "@/components/AppHeader";
import {
  ActionIcon,
  Group,
  useMantineColorScheme,
  Text,
  Container,
  Stack,
  Center,
} from "@mantine/core";
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";

const ThemeSwitcher = () => {
  const { setColorScheme, colorScheme } = useMantineColorScheme();

  return (
    <Stack gap="xs" align="center">
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
    <Container py={20} w="100%">
      <AppHeader title="设置" />
      <Center>
        <ThemeSwitcher />
      </Center>
    </Container>
  );
}
