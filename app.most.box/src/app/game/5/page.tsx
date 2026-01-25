"use client";

import { AppHeader } from "@/components/AppHeader";
import { Stack, Text, Box, Button, Group } from "@mantine/core";

import { useState } from "react";
import "@/app/game/5/page.scss";

export default function PageGame5() {
  // 五子棋逻辑
  const SIZE = 15;
  type Cell = 0 | 1 | 2; // 0: 空, 1: 黑, 2: 白
  const createEmptyBoard = (): Cell[][] =>
    Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => 0 as Cell),
    );

  const [board, setBoard] = useState<Cell[][]>(createEmptyBoard());
  const [current, setCurrent] = useState<Cell>(1); // 黑子先行
  const [winner, setWinner] = useState<Cell | 0>(0);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [moves, setMoves] = useState<
    Array<{ r: number; c: number; player: Cell }>
  >([]);

  const checkWinFrom = (r: number, c: number, target: Cell): boolean => {
    const dirs: Array<[number, number]> = [
      [0, 1], // 横
      [1, 0], // 竖
      [1, 1], // 斜 ↘
      [1, -1], // 斜 ↗
    ];
    for (const [dr, dc] of dirs) {
      let count = 1;
      // 向正方向统计
      let rr = r + dr,
        cc = c + dc;
      while (
        rr >= 0 &&
        rr < SIZE &&
        cc >= 0 &&
        cc < SIZE &&
        board[rr][cc] === target
      ) {
        count++;
        rr += dr;
        cc += dc;
      }
      // 向反方向统计
      rr = r - dr;
      cc = c - dc;
      while (
        rr >= 0 &&
        rr < SIZE &&
        cc >= 0 &&
        cc < SIZE &&
        board[rr][cc] === target
      ) {
        count++;
        rr -= dr;
        cc -= dc;
      }
      if (count >= 5) return true;
    }
    return false;
  };

  const handleCellClick = (r: number, c: number) => {
    if (winner) return; // 已有胜者，不可落子
    if (board[r][c] !== 0) return; // 非空位不可落子
    setBoard((prev) => {
      const next = prev.map((row) => row.slice());
      next[r][c] = current;
      return next;
    });
    // 记录走子历史与最新一步坐标
    setMoves((prev) => [...prev, { r, c, player: current }]);
    setLastMove([r, c]);
    const won = checkWinFrom(r, c, current);
    if (won) {
      setWinner(current);
    } else {
      setCurrent(current === 1 ? 2 : 1);
    }
  };

  // 新增悔棋功能
  const undoMove = () => {
    setMoves((prevMoves) => {
      if (prevMoves.length === 0) return prevMoves;
      const last = prevMoves[prevMoves.length - 1];

      setBoard((prevBoard) => {
        const next = prevBoard.map((row) => row.slice());
        next[last.r][last.c] = 0;
        return next;
      });

      setCurrent(last.player);
      setWinner(0);

      const newMoves = prevMoves.slice(0, prevMoves.length - 1);
      setLastMove(
        newMoves.length
          ? [newMoves[newMoves.length - 1].r, newMoves[newMoves.length - 1].c]
          : null,
      );

      return newMoves;
    });
  };

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setCurrent(1);
    setWinner(0);
    setLastMove(null);
    setMoves([]);
  };

  const statusText = winner
    ? `${winner === 1 ? "黑" : "白"}棋获胜！`
    : `${current === 1 ? "黑" : "白"}棋落子`;

  return (
    <Box id="page-game-5">
      <AppHeader title="五子棋" />
      <Stack gap={12}>
        <Group justify="space-between">
          <Text variant="gradient" size="md">
            {statusText}
          </Text>
          <Group>
            <Button
              onClick={undoMove}
              variant="outline"
              disabled={moves.length === 0}
            >
              悔棋
            </Button>
            <Button onClick={resetGame} variant="light">
              重新开始
            </Button>
          </Group>
        </Group>
        <Box className="gomoku-board">
          {Array.from({ length: SIZE }).map((_, r) =>
            Array.from({ length: SIZE }).map((_, c) => (
              <Box
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                className={`gomoku-cell${
                  !winner && board[r][c] === 0 ? " clickable" : ""
                }`}
              >
                {board[r][c] !== 0 && (
                  <Box
                    className={`gomoku-stone ${
                      board[r][c] === 1 ? "black" : "white"
                    }`}
                  />
                )}
                {lastMove && lastMove[0] === r && lastMove[1] === c && (
                  <Box className="gomoku-last-move" />
                )}
              </Box>
            )),
          )}
        </Box>
      </Stack>
    </Box>
  );
}
