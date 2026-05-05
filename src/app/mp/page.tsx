"use client";

import { AppHeader } from "@/components/AppHeader";
import { Container, SimpleGrid, Paper, Text, Group } from "@mantine/core";
import Link from "next/link";
import { IconLock, IconDatabaseImport } from "@tabler/icons-react";

export default function MpPage() {
  const tools = [
    {
      title: "加密 / 解密",
      description: "文本内容的加密与解密工具",
      href: "/mp/mi",
      icon: <IconLock size={24} />,
    },
    {
      title: "数据迁移",
      description: "将旧版加密数据迁移到新版格式",
      href: "/mp/migrate",
      icon: <IconDatabaseImport size={24} />,
    },
  ];

  return (
    <>
      <AppHeader title="常用工具" />
      <Container size="sm" py="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {tools.map((tool) => (
            <Paper
              key={tool.href}
              component={Link}
              href={tool.href}
              p="xl"
              radius="md"
              withBorder
              style={{
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
                transition: "transform 0.2s ease",
              }}
            >
              <Group>
                {tool.icon}
                <div style={{ flex: 1 }}>
                  <Text size="lg" fw={700} mb={5}>
                    {tool.title}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {tool.description}
                  </Text>
                </div>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      </Container>
    </>
  );
}
