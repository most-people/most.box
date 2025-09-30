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
  score?: number; // 累计分数（保留，但不再用于结算）
  coins: number; // 金币
  bet?: number; // 本局下注
  isDealer?: boolean; // 是否为庄家
  isOut?: boolean; // 金币归零后出局
};

type RoundStage = "betting" | "playing" | "settled"; // 回合阶段

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
  const [roundStage, setRoundStage] = useState<RoundStage>("betting");
  const [actionLock, setActionLock] = useState(false); // 防止要牌被短时间内触发两次
  const [dealerPlayerId, setDealerPlayerId] = useState<string | null>(null); // 当前庄家
  const [dealerTurn, setDealerTurn] = useState(false); // 庄家手动回合

  // 选择下一任庄家（根据玩家列表顺序轮换，跳过已出局）
  function selectNextDealer(
    currentPlayers: Player[],
    prevDealerId: string | null
  ): string | null {
    const eligible = currentPlayers.filter((p) => !p.isOut);
    if (eligible.length === 0) return null;
    // 若无上一任庄家，则选择列表中的第一个未出局玩家
    if (!prevDealerId) return eligible[0].id;
    const order = currentPlayers.map((p) => p.id);
    const startIdx = Math.max(0, order.indexOf(prevDealerId));
    let i = startIdx + 1;
    for (let step = 0; step < order.length; step++) {
      const id = order[i % order.length];
      const p = currentPlayers.find((pp) => pp.id === id);
      if (p && !p.isOut) return p.id;
      i++;
    }
    // 兜底：返回第一个未出局玩家
    return eligible[0].id;
  }

  // 是否所有未出局的非庄家玩家下注有效
  function allValidBets() {
    // 下注阶段根据下一任庄家来判断，确保非庄家都已下注
    const nextDealerId = selectNextDealer(players, dealerPlayerId);
    const nonDealerActive = players.filter(
      (p) => p.id !== nextDealerId && !p.isOut
    );
    if (nonDealerActive.length === 0) return false;
    return nonDealerActive.every((p) => {
      const b = typeof p.bet === "number" ? p.bet : 0;
      return b > 0 && b <= p.coins;
    });
  }

  const canStart =
    roundStage === "betting" &&
    players.filter((p) => !p.isOut).length >= 2 &&
    allValidBets();

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
        {
          id,
          name: n.trim(),
          hand: [],
          status: "pending",
          score: 0,
          coins: 100,
          bet: 0,
          isDealer: false,
          isOut: false,
        },
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
          coins: 100,
          bet: 0,
          isDealer: false,
          isOut: false,
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
    setRoundStage("betting");
    setDealerPlayerId(null);
    setDealerTurn(false);
  }

  function startGame() {
    const eligible = players.filter((p) => !p.isOut);
    if (eligible.length < 2) return; // 至少两人才能开始（包含庄家）
    if (!allValidBets()) return;

    const newDeck = createDeck();
    setDeck(newDeck);
    // 初始化手牌
    // 轮换选择庄家（跳过出局玩家）
    const dealerId = selectNextDealer(players, dealerPlayerId);
    if (!dealerId) return;
    setDealerPlayerId(dealerId);

    const initPlayers = players.map((p) => ({
      ...p,
      hand: [] as CardType[],
      status: "pending",
      result: undefined,
      isDealer: p.id === dealerId,
    }));
    const initDealer = { hand: [] as CardType[], hideHole: true };

    // 发两张牌（轮发）
    for (let i = 0; i < 2; i++) {
      for (let pi = 0; pi < initPlayers.length; pi++) {
        // 非庄家且未出局才发玩家手牌
        if (!initPlayers[pi].isDealer && !initPlayers[pi].isOut) {
          initPlayers[pi].hand.push(...drawOne(newDeck));
        }
      }
      initDealer.hand.push(...drawOne(newDeck));
    }

    // 处理黑杰克
    const dealerHasBJ = calculateHandValue(initDealer.hand).isBlackjack;
    for (const p of initPlayers) {
      if (p.isDealer || p.isOut) continue; // 庄家或出局玩家不参与黑杰克判定
      const pv = calculateHandValue(p.hand);
      if (pv.isBlackjack) p.status = "blackjack";
    }

    setPlayers(initPlayers as Player[]);
    setDealer(initDealer);
    setRoundStage("playing");

    if (dealerHasBJ) {
      // 庄家黑杰克直接结算（非庄家玩家：黑杰克则平，否则输）
      setPlayers(() => {
        let dealerDelta = 0;
        const afterPlayers = initPlayers.map((p) => {
          if (p.isDealer) return { ...p };
          if (p.isOut) return { ...p };
          const pv = calculateHandValue(p.hand);
          const pr = pv.isBlackjack ? "push" : "lose";
          const bet = Math.max(0, Math.min(p.bet ?? 0, p.coins));
          if (pr === "lose") dealerDelta += bet; // 庄家赢下注
          const coins = pr === "lose" ? Math.max(0, p.coins - bet) : p.coins;
          const isOut = coins <= 0 ? true : p.isOut;
          return { ...p, status: p.status, result: pr, coins, isOut };
        });
        const final = afterPlayers.map((p) => {
          if (!p.isDealer) return p as Player;
          const newCoins = Math.max(0, p.coins + dealerDelta);
          const dealerRes: Player["result"] =
            dealerDelta > 0 ? "win" : dealerDelta < 0 ? "lose" : "push";
          return {
            ...p,
            coins: newCoins,
            result: dealerRes,
            isOut: newCoins <= 0 ? true : p.isOut,
          } as Player;
        });
        return final as Player[];
      });
      setDealer({ ...initDealer, hideHole: false });
      setActiveIndex(-1);
      setRoundStage("settled");
      setDealerTurn(false);
      return;
    }

    // 找到第一个可操作的非庄家且未出局玩家
    const first = initPlayers.findIndex(
      (p) => p.status === "pending" && !p.isDealer && !p.isOut
    );
    setActiveIndex(first);
    setDealerTurn(false);
  }

  // 新回合：清空手牌与状态，进入下注阶段（保留金币与出局状态）
  function newRound() {
    setPlayers((ps) =>
      ps.map((p) => ({
        ...p,
        hand: [],
        status: "pending",
        result: undefined,
        isDealer: false, // 新回合先清空庄家标记，下注阶段按轮换确定下一任庄家
        // 保留 bet，允许在下注阶段继续调整
      }))
    );
    setDealer({ hand: [], hideHole: true });
    setDeck([]);
    setActiveIndex(-1);
    setDealerTurn(false);
    setRoundStage("betting");
  }

  function goNextPlayer() {
    setActiveIndex((idx) => {
      const next = players.findIndex(
        (p, i) => i > idx && p.status === "pending" && !p.isDealer && !p.isOut
      );
      if (next === -1) {
        // 全部玩家完成，进入庄家手动回合
        setDealer((d) => ({ ...d, hideHole: false }));
        setDealerTurn(true);
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
    // 改为：仅亮牌并进入庄家手动回合（要牌/停牌按钮）
    setDealer((d) => ({ ...d, hideHole: false }));
    setDealerTurn(true);
  }

  function settleRound() {
    const dv = calculateHandValue(dealer.hand).total;
    setPlayers((ps) => {
      let dealerDelta = 0;
      const updated = ps.map((p) => {
        if (p.isDealer) return { ...p };
        if (p.isOut) return { ...p, result: undefined };
        const pv = calculateHandValue(p.hand).total;
        let result: Player["result"] | undefined = undefined;
        if (p.status === "bust") result = "lose";
        else {
          if (dv > 21) result = "win";
          else if (p.status === "blackjack" && dv !== 21) result = "win";
          else if (pv > dv) result = "win";
          else if (pv < dv) result = "lose";
          else result = "push";
        }
        const bet = Math.max(0, Math.min(p.bet ?? 0, p.coins));
        if (result === "win") dealerDelta -= bet;
        else if (result === "lose") dealerDelta += bet;
        const coins =
          result === "win"
            ? p.coins + bet
            : result === "lose"
            ? Math.max(0, p.coins - bet)
            : p.coins;
        const isOut = coins <= 0 ? true : p.isOut;
        return { ...p, result, coins, isOut } as Player;
      });
      return updated.map((p) => {
        if (!p.isDealer) return p;
        const newCoins = Math.max(0, p.coins + dealerDelta);
        const dealerRes: Player["result"] =
          dealerDelta > 0 ? "win" : dealerDelta < 0 ? "lose" : "push";
        return {
          ...p,
          coins: newCoins,
          result: dealerRes,
          isOut: newCoins <= 0 ? true : p.isOut,
        } as Player;
      });
    });
    setRoundStage("settled");
    setDealerTurn(false);
  }

  function onDealerHit() {
    if (!dealerTurn || actionLock) return;
    setActionLock(true);
    const card = drawFromDeckOnce();
    const dh = [...dealer.hand, card];
    setDealer({ hand: dh, hideHole: false });
    const dv = calculateHandValue(dh);
    setTimeout(() => {
      if (dv.total > 21 || dv.total === 21) {
        settleRound();
      }
      setActionLock(false);
    }, 0);
  }

  function onDealerStand() {
    if (!dealerTurn) return;
    settleRound();
  }

  function PlayersGrid() {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {players
          .filter((pp) => !pp.isDealer)
          .map((p) => {
            const v = calculateHandValue(p.hand);
            const isActive =
              players.findIndex((pp) => pp.id === p.id) === activeIndex;
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
                    <Badge color="yellow" variant="light">
                      金币：{p.coins}
                    </Badge>
                    {p.isOut && <Badge color="red">出局</Badge>}
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
                  {/* 下注阶段控件 */}
                  {roundStage === "betting" && !p.isOut && (
                    <BetControls player={p} />
                  )}
                  {isActive && roundStage === "playing" && !p.isOut && (
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

  // 下注控件（独立组件，增强交互流畅度）
  function BetControls({ player }: { player: Player }) {
    const setBet = (val: number) => {
      setPlayers((ps) =>
        ps.map((pp) =>
          pp.id === player.id
            ? {
                ...pp,
                bet: Math.max(1, Math.min(Math.floor(val) || 0, pp.coins)),
              }
            : pp
        )
      );
    };
    return (
      <Group gap="xs" wrap="nowrap">
        <NumberInput
          value={player.bet ?? 0}
          onChange={(val) => {
            const num = typeof val === "number" ? val : Number(val);
            setBet(num);
          }}
          min={1}
          max={player.coins}
          clampBehavior="strict"
          inputMode="numeric"
          style={{ width: 120 }}
        />
        <Group gap={4} wrap="nowrap">
          <Button size="xs" variant="light" onClick={() => setBet(10)}>
            10
          </Button>
          <Button size="xs" variant="light" onClick={() => setBet(50)}>
            50
          </Button>
          <Button
            size="xs"
            variant="light"
            onClick={() => setBet(Math.max(1, player.coins))}
          >
            最大
          </Button>
          <Button
            size="xs"
            variant="outline"
            color="gray"
            onClick={() => setBet(1)}
          >
            最小
          </Button>
        </Group>
        <Text c="gray.5">下注</Text>
      </Group>
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
          已添加 {players.length}/{MAX_PLAYERS} 名；每人初始金币 100。
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
            onClick={newRound}
            disabled={players.length === 0 || roundStage !== "settled"}
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
            <Group gap={8}>
              <Text fw={700}>
                庄家
                {dealerPlayerId
                  ? `：${
                      players.find((p) => p.id === dealerPlayerId)?.name ?? ""
                    }`
                  : ""}
              </Text>
              {dealerPlayerId && (
                <Badge color="yellow" variant="light">
                  金币：
                  {players.find((p) => p.id === dealerPlayerId)?.coins ?? 0}
                </Badge>
              )}
              {dealerPlayerId &&
                (() => {
                  const dr = players.find(
                    (p) => p.id === dealerPlayerId
                  )?.result;
                  if (!dr) return null;
                  return (
                    <Badge
                      color={
                        dr === "win"
                          ? "green"
                          : dr === "lose"
                          ? "red"
                          : "yellow"
                      }
                    >
                      {dr === "win" ? "胜" : dr === "lose" ? "负" : "平"}
                    </Badge>
                  );
                })()}
            </Group>
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
          {dealerTurn && roundStage !== "settled" && (
            <Group mt="sm">
              <Button onClick={onDealerHit} color="red" disabled={actionLock}>
                庄家要牌
              </Button>
              <Button onClick={onDealerStand} color="blue">
                庄家停牌
              </Button>
            </Group>
          )}
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
