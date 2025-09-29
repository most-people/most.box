"use client";

import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  Badge,
  Box,
  Button,
  Container,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import "@/app/game/black/Black and white chess.scss";

// ======= Types & Constants =======
const BOARD_SIZE = 8;
type Player = 1 | -1; // 1: Black, -1: White

type Board = number[][]; // 0 empty, 1 black, -1 white

type Move = { r: number; c: number; flips: { r: number; c: number }[] };

const DIRECTIONS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 1 },
];

const POSITION_WEIGHTS: number[][] = [
  [120, -20, 20, 5, 5, 20, -20, 120],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [120, -20, 20, 5, 5, 20, -20, 120],
];

// ======= Helpers =======
function inBounds(r: number, c: number) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function createInitialBoard(): Board {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0)
  );
  const mid = BOARD_SIZE / 2;
  board[mid - 1][mid - 1] = -1; // white
  board[mid][mid] = -1; // white
  board[mid - 1][mid] = 1; // black
  board[mid][mid - 1] = 1; // black
  return board;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

function getFlipsForMove(board: Board, r: number, c: number, player: Player) {
  if (board[r][c] !== 0) return [];
  const flips: { r: number; c: number }[] = [];
  for (const { dr, dc } of DIRECTIONS) {
    let nr = r + dr;
    let nc = c + dc;
    const line: { r: number; c: number }[] = [];
    // First must have at least one opponent piece in that direction
    while (inBounds(nr, nc) && board[nr][nc] === -player) {
      line.push({ r: nr, c: nc });
      nr += dr;
      nc += dc;
    }
    if (line.length > 0 && inBounds(nr, nc) && board[nr][nc] === player) {
      flips.push(...line);
    }
  }
  return flips;
}

function listValidMoves(board: Board, player: Player): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const flips = getFlipsForMove(board, r, c, player);
      if (flips.length > 0) moves.push({ r, c, flips });
    }
  }
  return moves;
}

function applyMove(board: Board, move: Move, player: Player): Board {
  const nb = cloneBoard(board);
  nb[move.r][move.c] = player;
  for (const f of move.flips) nb[f.r][f.c] = player;
  return nb;
}

function countPieces(board: Board) {
  let black = 0;
  let white = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 1) black++;
      if (board[r][c] === -1) white++;
    }
  }
  return { black, white };
}

function isGameOver(board: Board) {
  return (
    listValidMoves(board, 1).length === 0 &&
    listValidMoves(board, -1).length === 0
  );
}

function pickAiMove(board: Board, ai: Player): Move | null {
  const moves = listValidMoves(board, ai);
  if (moves.length === 0) return null;
  // Heuristic: corner > edge > high flips > weighted position
  let best: Move | null = null;
  let bestScore = -Infinity;
  for (const m of moves) {
    const base = m.flips.length * 10; // prioritize captures
    const posWeight = POSITION_WEIGHTS[m.r][m.c];
    // Corner bonus
    const isCorner =
      (m.r === 0 && m.c === 0) ||
      (m.r === 0 && m.c === BOARD_SIZE - 1) ||
      (m.r === BOARD_SIZE - 1 && m.c === 0) ||
      (m.r === BOARD_SIZE - 1 && m.c === BOARD_SIZE - 1);
    const cornerBonus = isCorner ? 200 : 0;
    const score = base + posWeight + cornerBonus;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

function toLabel(player: Player) {
  return player === 1 ? "黑" : "白";
}

function getOpp(player: Player): Player {
  return (player * -1) as Player;
}

// ======= UI Components =======
function Cell({
  value,
  isValid,
  onClick,
  isLastMove,
}: {
  value: number;
  isValid?: boolean;
  onClick?: () => void;
  isLastMove?: boolean;
}) {
  return (
    <Box
      onClick={onClick}
      className={`othello-cell${isValid ? " is-valid" : ""}`}
    >
      {isValid && value === 0 && <Box className="othello-cell__hint" />}
      {value !== 0 && (
        <Box
          className={`othello-disc ${
            value === 1 ? "othello-disc--black" : "othello-disc--white"
          }${isLastMove ? " is-last" : ""}`}
        />
      )}
    </Box>
  );
}

export default function PageGameBlack() {
  const [board, setBoard] = useState<Board>(() => createInitialBoard());
  const [current, setCurrent] = useState<Player>(1); // Black starts
  const [human, setHuman] = useState<Player>(1); // default human as Black
  const ai = getOpp(human);
  const [lastMove, setLastMove] = useState<{ r: number; c: number } | null>(
    null
  );
  const [aiThinking, setAiThinking] = useState(false);
  const [autoPassInfo, setAutoPassInfo] = useState<string | null>(null);
  const aiTimerRef = useRef<number | null>(null);
  const [boardColor, setBoardColor] = useState<string>("#DCC39E");
  const [history, setHistory] = useState<
    {
      board: Board;
      current: Player;
      lastMove: { r: number; c: number } | null;
    }[]
  >([]);

  const validMoves = useMemo(
    () => listValidMoves(board, current),
    [board, current]
  );

  const scores = useMemo(() => countPieces(board), [board]);

  const gameOver = useMemo(() => isGameOver(board), [board]);

  useEffect(() => {
    // AI turn handler
    if (gameOver) return;
    if (current === ai) {
      const moves = listValidMoves(board, ai);
      if (moves.length === 0) {
        // AI has no moves, auto-pass to human
        setHistory((h) => [...h, { board, current, lastMove }]);
        setAutoPassInfo(`${toLabel(ai)}方无可落子，自动跳过回合`);
        setCurrent(getOpp(current));
        return;
      }
      setAiThinking(true);
      // Simulate thinking delay
      aiTimerRef.current = window.setTimeout(() => {
        const picked = pickAiMove(board, ai);
        if (picked) {
          setHistory((h) => [...h, { board, current, lastMove }]);
          const nb = applyMove(board, picked, ai);
          setBoard(nb);
          setLastMove({ r: picked.r, c: picked.c });
          setCurrent(getOpp(current));
        }
        setAiThinking(false);
      }, 400);
    }
    return () => {
      if (aiTimerRef.current) {
        window.clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [current, ai, board, gameOver]);

  useEffect(() => {
    if (!autoPassInfo) return;
    const t = window.setTimeout(() => setAutoPassInfo(null), 1200);
    return () => window.clearTimeout(t);
  }, [autoPassInfo]);

  // Handle human click
  function onCellClick(r: number, c: number) {
    if (gameOver) return;
    if (current !== human) return; // not human's turn
    const move = validMoves.find((m) => m.r === r && m.c === c);
    if (!move) return;
    setHistory((h) => [...h, { board, current, lastMove }]);
    const nb = applyMove(board, move, human);
    setBoard(nb);
    setLastMove({ r, c });
    setCurrent(getOpp(current));
  }

  function resetGame() {
    setBoard(createInitialBoard());
    setCurrent(1);
    setLastMove(null);
    setAiThinking(false);
    setAutoPassInfo(null);
    setHistory([]);
  }

  // Handle cases where current player has no valid moves (auto-pass)
  useEffect(() => {
    if (gameOver) return;
    const moves = listValidMoves(board, current);
    if (moves.length === 0) {
      if (current !== ai) {
        setHistory((h) => [...h, { board, current, lastMove }]);
      }
      setAutoPassInfo(`${toLabel(current)}方无可落子，自动跳过回合`);
      setCurrent(getOpp(current));
    }
  }, [board, current, gameOver, ai]);

  function undoMove() {
    if (aiTimerRef.current) {
      window.clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    setAiThinking(false);
    setAutoPassInfo(null);
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setBoard(prev.board);
      setCurrent(prev.current);
      setLastMove(prev.lastMove);
      return h.slice(0, -1);
    });
  }

  const winnerLabel = useMemo(() => {
    if (!gameOver) return null;
    if (scores.black === scores.white) return "平局";
    return scores.black > scores.white ? "黑方胜" : "白方胜";
  }, [gameOver, scores]);

  const boardGrid = useMemo(() => {
    const movesMap = new Set(validMoves.map((m) => `${m.r}-${m.c}`));
    const rows: JSX.Element[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const key = `${r}-${c}`;
        const val = board[r][c];
        const isValid = movesMap.has(key);
        const isLast = lastMove && lastMove.r === r && lastMove.c === c;
        rows.push(
          <Box key={key} className="cell-wrapper">
            <Tooltip
              label={
                isValid ? "可落子" : val === 0 ? "" : toLabel(val as Player)
              }
              openDelay={200}
            >
              <Box onClick={() => onCellClick(r, c)} className="cell-inner">
                <Cell
                  value={val}
                  isValid={isValid}
                  isLastMove={isLast ?? undefined}
                  onClick={() => onCellClick(r, c)}
                />
              </Box>
            </Tooltip>
          </Box>
        );
      }
    }
    return rows;
  }, [board, validMoves, lastMove]);

  return (
    <Container py={20} id="page-game-black">
      <AppHeader title="黑白棋（Othello）" />

      <Stack gap="md">
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" align="center">
            <Group gap="xs" align="center">
              <Badge size="lg" color="dark" variant="filled">
                黑：{scores.black}
              </Badge>
              <Badge size="lg" color="gray" variant="light">
                白：{scores.white}
              </Badge>
            </Group>
            <Group>
              <SegmentedControl
                value={human === 1 ? "black" : "white"}
                onChange={(v) => {
                  const nextHuman = v === "black" ? 1 : -1;
                  setHuman(nextHuman as Player);
                  if (current !== nextHuman) {
                    setCurrent(getOpp(nextHuman as Player));
                  }
                }}
                data={[
                  { label: "玩家执黑", value: "black" },
                  { label: "玩家执白", value: "white" },
                ]}
              />
              <Button onClick={resetGame} variant="light">
                重开
              </Button>
              <Button
                onClick={undoMove}
                variant="outline"
                disabled={history.length === 0}
              >
                悔棋
              </Button>
            </Group>
          </Group>
          <Group mt="sm" gap="xs">
            <Badge color={current === 1 ? "dark" : "gray"} variant="filled">
              当前回合：{toLabel(current)}
            </Badge>
            {aiThinking && <Badge color="indigo">AI思考中…</Badge>}
            {autoPassInfo && <Badge color="orange">{autoPassInfo}</Badge>}
            {gameOver && <Badge color="green">{winnerLabel}</Badge>}
          </Group>
        </Paper>

        {/* Board */}
        <Box className="board-container">
          <Box className="board-grid">{boardGrid}</Box>
        </Box>

        {/* Hints */}
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">
            规则：棋子只能落在能吃子的位置。吃子规则为沿直线方向将对方棋子夹在两枚己方棋子之间，夹住的棋子会被翻转为己方颜色。若当前回合无可落子位置，则自动跳过。双方均无可落子位置时，游戏结束，棋子多者获胜。
          </Text>
        </Paper>
      </Stack>
    </Container>
  );
}
