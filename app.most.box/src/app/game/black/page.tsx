"use client";

import { JSX, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  Badge,
  Box,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import "@/app/game/black/black-and-white-chess.scss";

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
  // removed AI-related states: human/ai/aiThinking/aiTimerRef
  const [lastMove, setLastMove] = useState<{ r: number; c: number } | null>(
    null
  );
  const [autoPassInfo, setAutoPassInfo] = useState<string | null>(null);

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
    if (!autoPassInfo) return;
    const t = window.setTimeout(() => setAutoPassInfo(null), 1200);
    return () => window.clearTimeout(t);
  }, [autoPassInfo]);

  // Handle human click (now both sides are controlled by human)
  function onCellClick(r: number, c: number) {
    if (gameOver) return;
    const move = validMoves.find((m) => m.r === r && m.c === c);
    if (!move) return;
    setHistory((h) => [...h, { board, current, lastMove }]);
    const nb = applyMove(board, move, current);
    setBoard(nb);
    setLastMove({ r, c });
    setCurrent(getOpp(current));
  }

  function resetGame() {
    setBoard(createInitialBoard());
    setCurrent(1);
    setLastMove(null);
    setAutoPassInfo(null);
    setHistory([]);
  }

  // Auto-pass when current player has no valid moves
  useEffect(() => {
    if (gameOver) return;
    const moves = listValidMoves(board, current);
    if (moves.length === 0) {
      setHistory((h) => [...h, { board, current, lastMove }]);
      setAutoPassInfo(`${toLabel(current)}方无可落子，自动跳过回合`);
      setCurrent(getOpp(current));
    }
  }, [board, current, gameOver]);

  function undoMove() {
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
            {/* removed AI thinking badge */}
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
