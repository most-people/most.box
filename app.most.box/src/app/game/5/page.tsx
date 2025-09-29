"use client";

import { AppHeader } from "@/components/AppHeader";
import { Anchor, Stack, Text, Box, Button, Group } from "@mantine/core";
import dayjs from "dayjs";
import { ethers } from "ethers";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function PageWeb3Ethers() {
  useEffect(() => {
    (window as any).ethers = ethers;
    (window as any).dayjs = dayjs;
  }, []);

  // 五子棋逻辑
  const SIZE = 15;
  type Cell = 0 | 1 | 2; // 0: 空, 1: 黑, 2: 白
  const createEmptyBoard = (): Cell[][] =>
    Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => 0 as Cell)
    );

  const [board, setBoard] = useState<Cell[][]>(createEmptyBoard());
  const [current, setCurrent] = useState<Cell>(1); // 黑子先行
  const [winner, setWinner] = useState<Cell | 0>(0);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);

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
    setLastMove([r, c]);
    const won = checkWinFrom(r, c, current);
    if (won) {
      setWinner(current);
    } else {
      setCurrent(current === 1 ? 2 : 1);
    }
  };

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setCurrent(1);
    setWinner(0);
    setLastMove(null);
  };

  const statusText = winner
    ? `${winner === 1 ? "黑" : "白"}方获胜！`
    : `${current === 1 ? "黑" : "白"}子回合`;

  return (
    <Box
      style={{
        position: "fixed",
        top: 64,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <AppHeader title="五子棋" />
      <Stack gap={12}>
        <Group justify="space-between">
          <Text fw={600}>{statusText}</Text>
          <Button
            onClick={resetGame}
            variant="light"
            color="blue"
            radius="md"
            w={120}
          >
            重新开始
          </Button>
        </Group>
        <Box
          style={{
            width: "min(95vw, 85vmin, 1000px)",
            margin: "0 auto",
            aspectRatio: "1 / 1",
            border: "2px solid #b58863",
            borderRadius: 12,
            background: "#f0d9b5",
            boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
            display: "grid",
            gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${SIZE}, 1fr)`,
            overflow: "hidden",
          }}
        >
          {Array.from({ length: SIZE }).map((_, r) =>
            Array.from({ length: SIZE }).map((_, c) => (
              <Box
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                style={{
                  position: "relative",
                  cursor: winner
                    ? "default"
                    : board[r][c] === 0
                    ? "pointer"
                    : "default",
                  // 内部网格线：避免双重线条，仅绘制上/左边
                  borderTop: r === 0 ? "none" : "1px solid #b58863",
                  borderLeft: c === 0 ? "none" : "1px solid #b58863",
                  transition: "background 160ms ease",
                }}
              >
                {board[r][c] !== 0 && (
                  <Box
                    style={{
                      width: "80%",
                      height: "80%",
                      borderRadius: "50%",
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      background: board[r][c] === 1 ? "#222" : "#fff",
                      border: board[r][c] === 2 ? "1px solid #ddd" : "none",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
                    }}
                  />
                )}
                {lastMove && lastMove[0] === r && lastMove[1] === c && (
                  <Box
                    style={{
                      width: "88%",
                      height: "88%",
                      borderRadius: "50%",
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      outline: "2px solid #ff5252",
                      outlineOffset: "-4px",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </Box>
            ))
          )}
        </Box>
      </Stack>
    </Box>
  );
}
