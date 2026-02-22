"use client";

import { AppHeader } from "@/components/AppHeader";
import { Container, SimpleGrid, Paper, Text, Group } from "@mantine/core";
import Link from "next/link";

export default function GamePage() {
  const games = [
    {
      title: "五子棋",
      description: "五子连珠即可获胜",
      href: "/game/5",
      icon: "⚫",
    },
    {
      title: "黑白棋",
      description: "翻转对手的棋子，占据棋盘",
      href: "/game/black",
      icon: "⚫",
    },
  ];

  return (
    <>
      <AppHeader title="小游戏" />
      <Container size="sm" py="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {games.map((game) => (
            <Paper
              key={game.href}
              component={Link}
              href={game.href}
              p="xl"
              radius="md"
              withBorder
              style={{
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <Group>
                <div style={{ flex: 1 }}>
                  <Text size="lg" fw={700} mb={5}>
                    {game.title}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {game.description}
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
