"use client";

import { AppHeader } from "@/components/AppHeader";
import { Container, SimpleGrid, Paper, Text, Group } from "@mantine/core";
import Link from "next/link";
import { IconGridDots, IconCircleHalf2 } from "@tabler/icons-react";

export default function GamePage() {
  const games = [
    {
      title: "五子棋",
      description: "五子连珠即可获胜",
      href: "/game/5",
      icon: <IconGridDots size={24} />,
    },
    {
      title: "黑白棋",
      description: "翻转对手的棋子，占据棋盘",
      href: "/game/black",
      icon: <IconCircleHalf2 size={24} />,
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
                transition: "transform 0.2s ease",
              }}
            >
              <Group>
                {game.icon}
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
