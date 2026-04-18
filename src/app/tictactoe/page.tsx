"use client";

import { useMemo, useState } from "react";

type Cell = "X" | "O" | null;

const WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function getWinner(board: Cell[]): Cell {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

export default function TicTacToePage() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");

  const winner = useMemo(() => getWinner(board), [board]);
  const isDraw = useMemo(() => !winner && board.every((cell) => cell !== null), [board, winner]);

  const status = winner
    ? `Winner: ${winner}`
    : isDraw
      ? "Draw"
      : `Current turn: ${turn}`;

  const handleClick = (index: number) => {
    if (board[index] || winner) {
      return;
    }

    const nextBoard = [...board];
    nextBoard[index] = turn;
    setBoard(nextBoard);
    setTurn(turn === "X" ? "O" : "X");
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setTurn("X");
  };

  return (
    <main className="screen ttt-screen">
      <section className="ttt-card">
        <h1>Tic-Tac-Toe</h1>
        <p className="ttt-status">{status}</p>

        <div className="ttt-grid" role="grid" aria-label="Tic-Tac-Toe board">
          {board.map((cell, index) => (
            <button
              key={index}
              type="button"
              className="ttt-cell"
              onClick={() => handleClick(index)}
              aria-label={`Cell ${index + 1}`}
            >
              {cell}
            </button>
          ))}
        </div>

        <button type="button" className="ttt-reset" onClick={reset}>
          Restart
        </button>
      </section>
    </main>
  );
}
