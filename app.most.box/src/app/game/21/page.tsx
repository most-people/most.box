"use client";

import { AppHeader } from "@/components/AppHeader";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPlayerPlay, IconRefresh, IconUserPlus } from "@tabler/icons-react";
import { useMemo, useState } from "react";

type Suit = "♠" | "♥" | "♦" | "♣";
type CardType = {
  rank: string; // A,2..10,J,Q,K
  value: number; // 1/11 for A in calculation, otherwise 2..10
  suit: Suit;
};

type Player = {
  id: string;
  name: string;
  hand: CardType[];
  status: "pending" | "bust" | "stand" | "blackjack";
  result?: "win" | "lose" | "push"; // 结算后显示
  score?: number; // 累计分数
};

const MAX_PLAYERS = 6;
const DECKS = 2; // 使用2副牌，避免多人时牌不够

function createDeck(): CardType[] {
  const suits: Suit[] = ["♠", "♥", "♦", "♣"];
  const ranks = [
    { r: "A", v: 11 },
    { r: "2", v: 2 },
    { r: "3", v: 3 },
    { r: "4", v: 4 },
    { r: "5", v: 5 },
    { r: "6", v: 6 },
    { r: "7", v: 7 },
    { r: "8", v: 8 },
    { r: "9", v: 9 },
    { r: "10", v: 10 },
    { r: "J", v: 10 },
    { r: "Q", v: 10 },
    { r: "K", v: 10 },
  ];
  const deck: CardType[] = [];
  for (let d = 0; d < DECKS; d++) {
    for (const suit of suits) {
      for (const { r, v } of ranks) {
        deck.push({ rank: r, value: v, suit });
      }
    }
  }
  // Fisher-Yates 洗牌
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calculateHandValue(hand: CardType[]) {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    total += c.value;
    if (c.rank === "A") aces++;
  }
  // A 按 11 计算，若爆则每个 A 变 1（每次减 10）
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  const isBlackjack = hand.length === 2 && total === 21;
  const isSoft = hand.some((c) => c.rank === "A") && total <= 21 && aces > 0;
  return { total, isSoft, isBlackjack };
}

function formatCard(card: CardType) {
  return `${card.rank}${card.suit}`;
}

function CardView({ card }: { card: CardType }) {
  const isRed = card.suit === "♥" || card.suit === "♦";
  return (
    <Box
      style={{
        width: 52,
        height: 72,
        borderRadius: 8,
        border: "1px solid var(--mantine-color-dark-4)",
        background: "var(--mantine-color-dark-6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text c={isRed ? "red" : "gray.0"} fw={700} size="lg">
        {formatCard(card)}
      </Text>
    </Box>
  );
}

function HiddenCard() {
  return (
    <Box
      style={{
        width: 52,
        height: 72,
        borderRadius: 8,
        border: "1px dashed var(--mantine-color-dark-4)",
        background:
          "repeating-linear-gradient(45deg, var(--mantine-color-dark-6), var(--mantine-color-dark-6) 8px, var(--mantine-color-dark-5) 8px, var(--mantine-color-dark-5) 16px)",
      }}
    />
  );
}

export default function PageGame21() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [dealer, setDealer] = useState<{ hand: CardType[]; hideHole: boolean }>(
    { hand: [], hideHole: true }
  );
  const [deck, setDeck] = useState<CardType[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [name, setName] = useState("");
  const [quickCount, setQuickCount] = useState<number | "">(1);
  const [roundFinished, setRoundFinished] = useState(false);
  const [actionLock, setActionLock] = useState(false); // 防止要牌被短时间内触发两次

  const canStart =
    players.length > 0 &&
    (roundFinished || players.every((p) => p.hand.length === 0));

  const dealerValue = useMemo(
    () => calculateHandValue(dealer.hand),
    [dealer.hand]
  );

  function drawOne(currentDeck: CardType[], take = 1) {
    const cards: CardType[] = [];
    for (let i = 0; i < take; i++) {
      const c = currentDeck.pop();
      if (!c) throw new Error("牌堆已空");
      cards.push(c);
    }
    return cards;
  }

  // 从当前状态牌堆抽一张，并更新牌堆状态（避免在 setState 回调中产生副作用导致双执行）
  function drawFromDeckOnce(): CardType {
    const newDeck = [...deck];
    const [card] = drawOne(newDeck);
    setDeck(newDeck);
    return card;
  }

  function addPlayerByName(n: string) {
    if (!n.trim()) return;
    setPlayers((ps) => {
      if (ps.length >= MAX_PLAYERS) return ps;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return [
        ...ps,
        { id, name: n.trim(), hand: [], status: "pending", score: 0 },
      ];
    });
    setName("");
  }

  function quickAddPlayers(count: number) {
    if (count <= 0) return;
    setPlayers((ps) => {
      const left = Math.max(0, MAX_PLAYERS - ps.length);
      const toAdd = Math.min(left, count);
      const next: Player[] = [];
      for (let i = 0; i < toAdd; i++) {
        const id = `${Date.now()}-${i}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        next.push({
          id,
          name: `玩家${ps.length + i + 1}`,
          hand: [],
          status: "pending",
          score: 0,
        });
      }
      return [...ps, ...next];
    });
  }

  function resetAll() {
    setPlayers([]);
    setDealer({ hand: [], hideHole: true });
    setDeck([]);
    setActiveIndex(-1);
    setRoundFinished(false);
  }

  function startGame() {
    if (players.length === 0) return;

    const newDeck = createDeck();
    setDeck(newDeck);
    // 初始化手牌
    const initPlayers = players.map((p) => ({
      ...p,
      hand: [] as CardType[],
      status: "pending",
      result: undefined,
    }));
    const initDealer = { hand: [] as CardType[], hideHole: true };

    // 发两张牌（轮发）
    for (let i = 0; i < 2; i++) {
      for (let pi = 0; pi < initPlayers.length; pi++) {
        initPlayers[pi].hand.push(...drawOne(newDeck));
      }
      initDealer.hand.push(...drawOne(newDeck));
    }

    // 处理黑杰克
    const dealerHasBJ = calculateHandValue(initDealer.hand).isBlackjack;
    for (const p of initPlayers) {
      const pv = calculateHandValue(p.hand);
      if (pv.isBlackjack) p.status = "blackjack";
    }

    setPlayers(initPlayers as Player[]);
    setDealer(initDealer);
    setRoundFinished(false);

    if (dealerHasBJ) {
      // 庄家黑杰克直接结算
      const dv = calculateHandValue(initDealer.hand).total;
      const resolved = initPlayers.map((p) => {
        const pv = calculateHandValue(p.hand);
        const pr = pv.isBlackjack ? "push" : "lose";
        const delta = 0;
        return {
          ...p,
          status: p.status,
          result: pr,
          score: (p.score ?? 0) + delta,
        };
      });
      setPlayers(resolved as Player[]);
      setDealer({ ...initDealer, hideHole: false });
      setActiveIndex(-1);
      setRoundFinished(true);
      return;
    }

    // 找到第一个可操作玩家
    const first = initPlayers.findIndex((p) => p.status === "pending");
    setActiveIndex(first);
  }

  function goNextPlayer() {
    setActiveIndex((idx) => {
      const next = players.findIndex(
        (p, i) => i > idx && p.status === "pending"
      );
      if (next === -1) {
        dealerPlay();
        return -1;
      }
      return next;
    });
  }

  function onHit() {
    if (activeIndex < 0 || actionLock) return;
    setActionLock(true);
    const card = drawFromDeckOnce();
    const copy = [...players];
    const p = { ...copy[activeIndex] };
    p.hand = [...p.hand, card];
    const v = calculateHandValue(p.hand).total;
    if (v > 21) p.status = "bust";
    else if (v === 21) p.status = "stand";
    copy[activeIndex] = p;
    setPlayers(copy);
    // 状态更新后进入下一个玩家
    setTimeout(() => {
      const cur = copy[activeIndex];
      const vv = calculateHandValue(cur?.hand ?? []).total;
      if (vv >= 21 || cur?.status !== "pending") goNextPlayer();
      setActionLock(false);
    }, 0);
  }

  function onStand() {
    if (activeIndex < 0) return;
    setPlayers((ps) => {
      const copy = [...ps];
      copy[activeIndex] = { ...copy[activeIndex], status: "stand" };
      return copy;
    });
    goNextPlayer();
  }

  function dealerPlay() {
    // 庄家亮牌并抽至至少17点（站在软17）
    let newDeck = [...deck];
    let dh = [...dealer.hand];
    let dv = calculateHandValue(dh);
    while (dv.total < 17) {
      dh.push(...drawOne(newDeck));
      dv = calculateHandValue(dh);
    }
    setDealer({ hand: dh, hideHole: false });
    setDeck(newDeck);

    // 结算
    setPlayers((ps) => {
      return ps.map((p) => {
        const pv = calculateHandValue(p.hand).total;
        let result: Player["result"] | undefined = undefined;
        if (p.status === "bust") result = "lose";
        else {
          if (dv.total > 21) result = "win"; // 庄家爆
          else if (p.status === "blackjack" && dv.total !== 21) result = "win";
          else if (pv > dv.total) result = "win";
          else if (pv < dv.total) result = "lose";
          else result = "push";
        }
        const delta = result === "win" ? 1 : result === "lose" ? -1 : 0;
        return { ...p, result, score: (p.score ?? 0) + delta };
      });
    });

    setRoundFinished(true);
  }

  function PlayersGrid() {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {players.map((p, idx) => {
          const v = calculateHandValue(p.hand);
          const isActive = idx === activeIndex;
          return (
            <Card
              key={p.id}
              shadow={isActive ? "md" : "sm"}
              radius="md"
              p="md"
              withBorder
            >
              <Group justify="space-between" mb={8}>
                <Group gap={8}>
                  <Text fw={700}>{p.name}</Text>
                  <Badge color="grape" variant="light">
                    分数：{p.score ?? 0}
                  </Badge>
                  {isActive && <Badge color="blue">当前操作</Badge>}
                </Group>
                <Group gap={8}>
                  {p.status === "bust" && <Badge color="red">爆了</Badge>}
                  {p.status === "blackjack" && (
                    <Badge color="green">黑杰克</Badge>
                  )}
                  {p.status === "stand" && <Badge color="gray">停牌</Badge>}
                  {p.result && (
                    <Badge
                      color={
                        p.result === "win"
                          ? "green"
                          : p.result === "lose"
                          ? "red"
                          : "yellow"
                      }
                    >
                      {p.result === "win"
                        ? "胜"
                        : p.result === "lose"
                        ? "负"
                        : "平"}
                    </Badge>
                  )}
                </Group>
              </Group>

              <Group>
                {p.hand.map((c, i) => (
                  <CardView key={i} card={c} />
                ))}
              </Group>

              <Group justify="space-between" mt="sm">
                <Text c="gray.4">点数：{v.total}</Text>
                {isActive && !roundFinished && (
                  <Group>
                    <Button onClick={onHit} color="red" disabled={actionLock}>
                      要牌
                    </Button>
                    <Button onClick={onStand} color="blue">
                      停牌
                    </Button>
                  </Group>
                )}
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>
    );
  }

  return (
    <Container py={20}>
      <AppHeader title="二十一点" />

      <Card radius="md" withBorder mt="md" p="md">
        <Title order={3} c="blue.4" mb={6}>
          添加玩家
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Group>
            <TextInput
              placeholder="例如：Alice"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button
              color="red"
              onClick={() => addPlayerByName(name)}
              disabled={players.length >= MAX_PLAYERS}
            >
              + 添加
            </Button>
          </Group>

          <Group>
            <Text c="gray.4">快速添加人数</Text>
            <NumberInput
              value={quickCount}
              onChange={(v) =>
                setQuickCount(typeof v === "string" ? Number(v) : v)
              }
              min={1}
              max={MAX_PLAYERS}
              clampBehavior="strict"
              style={{ width: 120 }}
            />
            <Button
              onClick={() =>
                quickAddPlayers(typeof quickCount === "number" ? quickCount : 1)
              }
              leftSection={<IconUserPlus size={16} stroke={2} />}
              disabled={players.length >= MAX_PLAYERS}
            >
              快速添加
            </Button>
          </Group>
        </SimpleGrid>

        <Text mt="sm" c="gray.5">
          已添加 {players.length}/{MAX_PLAYERS} 名
        </Text>

        <Group mt="md">
          <Button
            onClick={startGame}
            disabled={!canStart}
            leftSection={<IconPlayerPlay size={16} stroke={2} />}
          >
            开始游戏
          </Button>
          <Button
            color="orange"
            onClick={startGame}
            disabled={players.length === 0 || !roundFinished}
            leftSection={<IconRefresh size={16} stroke={2} />}
          >
            再来一次
          </Button>
          <Button
            variant="outline"
            color="gray"
            onClick={resetAll}
            leftSection={<IconRefresh size={16} stroke={2} />}
          >
            重置
          </Button>
        </Group>
      </Card>

      <Divider my="md" />

      {/* 游戏区域 */}
      <Stack>
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" mb={8}>
            <Text fw={700}>庄家</Text>
            {!dealer.hideHole && (
              <Badge color={dealerValue.total > 21 ? "red" : "gray"}>
                点数：{dealerValue.total}
              </Badge>
            )}
          </Group>
          <Group>
            {dealer.hand.map((c, i) => {
              if (i === 1 && dealer.hideHole) return <HiddenCard key={i} />;
              return <CardView key={i} card={c} />;
            })}
          </Group>
          {dealer.hideHole && (
            <Text c="gray.5" mt="xs">
              第二张牌未揭示
            </Text>
          )}
        </Card>

        {players.length > 0 ? (
          <PlayersGrid />
        ) : (
          <Card withBorder radius="md" p="md">
            <Text c="gray.5">请先添加至少一位玩家并点击开始游戏。</Text>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
