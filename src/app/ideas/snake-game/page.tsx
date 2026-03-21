'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

type Cell = 0 | 1 | 2; // 0=empty, 1=snake, 2=food
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const CELL_SIZE = 20;
const GRID_W = 25;
const GRID_H = 20;

function randomFood(snake: [number, number][]): [number, number] {
  let pos: [number, number];
  do {
    pos = [
      Math.floor(Math.random() * GRID_W),
      Math.floor(Math.random() * GRID_H),
    ];
  } while (snake.some(([x, y]) => x === pos[0] && y === pos[1]));
  return pos;
}

export default function SnakeGamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  const [grid, setGrid] = useState<Cell[][]>(() =>
    Array.from({ length: GRID_H }, () => Array(GRID_W).fill(0))
  );

  const snakeRef = useRef<[number, number][]>([[12, 10] as [number, number]]);
  const dirRef = useRef<Direction>('RIGHT');
  const nextDirRef = useRef<Direction>('RIGHT');
  const foodRef = useRef<[number, number]>([15, 10]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const draw = useCallback(
    (snake: [number, number][], food: [number, number]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;

      // Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= GRID_W; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL_SIZE, 0);
        ctx.lineTo(x * CELL_SIZE, GRID_H * CELL_SIZE);
        ctx.stroke();
      }
      for (let y = 0; y <= GRID_H; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL_SIZE);
        ctx.lineTo(GRID_W * CELL_SIZE, y * CELL_SIZE);
        ctx.stroke();
      }

      // Food
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      const [fx, fy] = food;
      ctx.beginPath();
      ctx.arc(
        fx * CELL_SIZE + CELL_SIZE / 2,
        fy * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.shadowBlur = 0;

      // Snake
      snake.forEach(([x, y], i) => {
        const isHead = i === 0;
        const gradient = ctx.createRadialGradient(
          x * CELL_SIZE + CELL_SIZE / 2,
          y * CELL_SIZE + CELL_SIZE / 2,
          0,
          x * CELL_SIZE + CELL_SIZE / 2,
          y * CELL_SIZE + CELL_SIZE / 2,
          CELL_SIZE / 2
        );
        if (isHead) {
          gradient.addColorStop(0, '#a78bfa');
          gradient.addColorStop(1, '#7c3aed');
        } else {
          gradient.addColorStop(0, '#6366f1');
          gradient.addColorStop(1, '#4f46e5');
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(
          x * CELL_SIZE + 1,
          y * CELL_SIZE + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2,
          isHead ? 5 : 3
        );
        ctx.fill();

        // Eyes on head
        if (isHead) {
          ctx.fillStyle = 'white';
          const eyeR = 2;
          let eye1x = x * CELL_SIZE + CELL_SIZE / 2;
          let eye1y = y * CELL_SIZE + CELL_SIZE / 2;
          let eye2x = x * CELL_SIZE + CELL_SIZE / 2;
          let eye2y = y * CELL_SIZE + CELL_SIZE / 2;
          const d = dirRef.current;
          if (d === 'UP') {
            eye1y -= 4;
            eye2y -= 4;
            eye1x -= 3;
            eye2x += 3;
          } else if (d === 'DOWN') {
            eye1y += 4;
            eye2y += 4;
            eye1x -= 3;
            eye2x += 3;
          } else if (d === 'LEFT') {
            eye1x -= 4;
            eye2x -= 4;
            eye1y -= 3;
            eye2y += 3;
          } else {
            eye1x += 4;
            eye2x += 4;
            eye1y -= 3;
            eye2y += 3;
          }
          ctx.beginPath();
          ctx.arc(eye1x, eye1y, eyeR, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(eye2x, eye2y, eyeR, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    },
    []
  );

  const startGame = useCallback(() => {
    const snake: [number, number][] = [[12, 10]];
    const food = randomFood(snake);
    snakeRef.current = snake;
    dirRef.current = 'RIGHT';
    nextDirRef.current = 'RIGHT';
    foodRef.current = food;
    setScore(0);
    setHighScore((h) => Math.max(h, score));
    setGameState('playing');
    draw(snake, food);
  }, [draw, score]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const tick = () => {
      const snake = snakeRef.current;
      const food = foodRef.current;
      const dir = nextDirRef.current;
      dirRef.current = dir;

      const head = [...snake[0]] as [number, number];
      if (dir === 'UP') head[1]--;
      else if (dir === 'DOWN') head[1]++;
      else if (dir === 'LEFT') head[0]--;
      else if (dir === 'RIGHT') head[0]++;

      // Wall collision
      if (head[0] < 0 || head[0] >= GRID_W || head[1] < 0 || head[1] >= GRID_H) {
        setGameState('over');
        return;
      }

      // Self collision
      if (snake.some(([x, y]) => x === head[0] && y === head[1])) {
        setGameState('over');
        return;
      }

      const ate = head[0] === food[0] && head[1] === food[1];
      const newSnake = [head, ...snake];
      if (!ate) {
        newSnake.pop();
      } else {
        foodRef.current = randomFood(newSnake);
        setScore((s) => s + 10);
      }

      snakeRef.current = newSnake;
      draw(newSnake, foodRef.current);
    };

    intervalRef.current = setInterval(tick, 120);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gameState, draw]);

  // Draw idle state
  useEffect(() => {
    if (gameState === 'idle' || gameState === 'over') {
      draw(snakeRef.current, foodRef.current);
    }
  }, [gameState, draw]);

  // Keyboard control
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== 'playing') {
        if (e.key === 'Enter' || e.key === ' ') startGame();
        return;
      }
      const key = e.key;
      if (
        (key === 'ArrowUp' || key === 'w') &&
        dirRef.current !== 'DOWN'
      ) {
        nextDirRef.current = 'UP';
        e.preventDefault();
      } else if (
        (key === 'ArrowDown' || key === 's') &&
        dirRef.current !== 'UP'
      ) {
        nextDirRef.current = 'DOWN';
        e.preventDefault();
      } else if (
        (key === 'ArrowLeft' || key === 'a') &&
        dirRef.current !== 'RIGHT'
      ) {
        nextDirRef.current = 'LEFT';
        e.preventDefault();
      } else if (
        (key === 'ArrowRight' || key === 'd') &&
        dirRef.current !== 'LEFT'
      ) {
        nextDirRef.current = 'RIGHT';
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, startGame]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex flex-col items-center justify-center p-4">
      {/* Back link */}
      <div className="w-full max-w-lg mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-200 text-sm font-medium transition-colors"
        >
          ← 返回点子站
        </Link>
      </div>

      <div className="text-center mb-4">
        <span className="text-5xl block mb-1">🐍</span>
        <h1 className="text-3xl font-bold text-white">贪食蛇</h1>
        <p className="text-slate-400 text-sm mt-1">
          用方向键或 WASD 控制蛇的移动
        </p>
      </div>

      <div className="flex items-center gap-6 mb-4 text-white font-mono text-sm">
        <div>
          得分：<span className="text-yellow-400 font-bold text-xl">{score}</span>
        </div>
        <div>
          最高：<span className="text-pink-400 font-bold text-xl">{Math.max(highScore, score)}</span>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GRID_W * CELL_SIZE}
          height={GRID_H * CELL_SIZE}
          className="rounded-xl shadow-2xl border border-slate-700"
        />

        {/* Overlay */}
        {gameState !== 'playing' && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
            <div className="text-center">
              {gameState === 'idle' && (
                <>
                  <p className="text-white text-xl mb-4">按 Enter 或 空格 开始</p>
                  <button
                    onClick={startGame}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg"
                  >
                    开始游戏
                  </button>
                </>
              )}
              {gameState === 'over' && (
                <>
                  <p className="text-red-400 text-2xl font-bold mb-2">Game Over!</p>
                  <p className="text-slate-300 mb-1">得分：{score}</p>
                  <p className="text-yellow-400 mb-4">最高：{Math.max(highScore, score)}</p>
                  <button
                    onClick={startGame}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg"
                  >
                    再来一局
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-4 text-xs text-slate-500">
        <span>↑↓←→ 或 WASD 控制方向</span>
        <span>·</span>
        <span>吃红点得分</span>
        <span>·</span>
        <span>别撞墙和自己的身体！</span>
      </div>
    </div>
  );
}
