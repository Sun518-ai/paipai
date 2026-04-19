'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

const TASKS = [
  { name: '修路', emoji: '🧱', target: 10, reward: 10 },
  { name: '运货', emoji: '📦', target: 8, reward: 15 },
  { name: '搅拌', emoji: '🏗️', target: 6, reward: 20 },
  { name: '吊装', emoji: '🏢', target: 5, reward: 25 },
  { name: '压路', emoji: '🛣️', target: 4, reward: 30 },
];

const VEHICLES = [
  { id: 'excavator', name: '挖掘机', emoji: '🚜', unlockLevel: 0 },
  { id: 'dump-truck', name: '卡车', emoji: '🚚', unlockLevel: 1 },
  { id: 'cement', name: '搅拌车', emoji: '🏗️', unlockLevel: 2 },
  { id: 'crane', name: '吊车', emoji: '🏢', unlockLevel: 3 },
  { id: 'roadroller', name: '压路机', emoji: '🛣️', unlockLevel: 4 },
];

interface GameState {
  score: number;
  currentTaskIndex: number;
  taskProgress: number;
  unlockedVehicles: string[];
}

function loadState(): GameState {
  if (typeof window === 'undefined') return defaultState();
  const saved = localStorage.getItem('construction-city-state');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return defaultState();
    }
  }
  return defaultState();
}

function defaultState(): GameState {
  return {
    score: 0,
    currentTaskIndex: 0,
    taskProgress: 0,
    unlockedVehicles: ['excavator'],
  };
}

function saveState(state: GameState) {
  localStorage.setItem('construction-city-state', JSON.stringify(state));
}

export default function ConstructionCityPage() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameState, setGameState] = useState<GameState>(defaultState);
  const [selectedVehicle, setSelectedVehicle] = useState('excavator');
  const [vehiclePosition, setVehiclePosition] = useState({ x: 50, y: 65 });
  const [taskPosition, setTaskPosition] = useState({ x: 50, y: 35 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hint, setHint] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);
  const [collectAnim, setCollectAnim] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const particleIdRef = useRef(0);

  const startGame = () => {
    setGameState(loadState());
    setGameStarted(true);
  };

  const currentTask = TASKS[gameState.currentTaskIndex];
  const currentVehicle = VEHICLES.find(v => v.id === selectedVehicle);

  const getDistance = () => {
    const dx = vehiclePosition.x - taskPosition.x;
    const dy = vehiclePosition.y - taskPosition.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const isNearTask = getDistance() < 15;

  const showHintMessage = (msg: string) => {
    setHint(msg);
    setShowHint(true);
    setTimeout(() => setShowHint(false), 1500);
  };

  const spawnParticles = (x: number, y: number, emoji: string) => {
    const newParticles = Array.from({ length: 6 }, () => ({
      id: particleIdRef.current++,
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
      emoji,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 800);
  };

  const handleTaskClick = () => {
    if (!isNearTask) {
      showHintMessage('🚜 离任务物品太远了，开近一点！');
      return;
    }

    setCollectAnim(true);
    spawnParticles(taskPosition.x, taskPosition.y, currentTask.emoji);

    const newProgress = gameState.taskProgress + 1;

    if (newProgress >= currentTask.target) {
      // Task completed!
      const newScore = gameState.score + currentTask.reward;
      const nextTaskIndex = (gameState.currentTaskIndex + 1) % TASKS.length;
      
      // Unlock vehicle every 2 tasks
      let unlockedVehicles = [...gameState.unlockedVehicles];
      if (gameState.currentTaskIndex % 2 === 1 && nextTaskIndex > 0) {
        const nextVehicle = VEHICLES[nextTaskIndex];
        if (nextVehicle && !unlockedVehicles.includes(nextVehicle.id)) {
          unlockedVehicles.push(nextVehicle.id);
        }
      }

      const newState: GameState = {
        score: newScore,
        currentTaskIndex: nextTaskIndex,
        taskProgress: 0,
        unlockedVehicles,
      };
      
      setGameState(newState);
      saveState(newState);
      showHintMessage(`🎉 ${currentTask.name}完成！+${currentTask.reward}分`);
    } else {
      const newState = { ...gameState, taskProgress: newProgress };
      setGameState(newState);
      saveState(newState);
      const remaining = currentTask.target - newProgress;
      showHintMessage(`+${currentTask.reward}分！还剩 ${remaining} 个`);
    }

    // Move task to new position
    setTimeout(() => {
      setTaskPosition({
        x: 15 + Math.random() * 60,
        y: 25 + Math.random() * 15,
      });
      setCollectAnim(false);
    }, 300);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const rect = sceneRef.current?.getBoundingClientRect();
    if (rect) {
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = (1 - (e.clientY - rect.top) / rect.height) * 100;
      setDragOffset({ x: vehiclePosition.x - x, y: vehiclePosition.y - y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !sceneRef.current) return;
    const rect = sceneRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = (1 - (e.clientY - rect.top) / rect.height) * 100;
    setVehiclePosition({
      x: Math.max(5, Math.min(85, x + dragOffset.x)),
      y: Math.max(15, Math.min(70, y + dragOffset.y)),
    });
  };

  const handlePointerUp = () => setIsDragging(false);

  const resetGame = () => {
    const newState = defaultState();
    setGameState(newState);
    saveState(newState);
    setSelectedVehicle('excavator');
    setVehiclePosition({ x: 50, y: 65 });
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center p-8">
        <Link href="/ideas" className="absolute top-4 left-4 text-white/80 hover:text-white flex items-center gap-2">
          ← 返回
        </Link>
        <div className="text-8xl animate-bounce mb-6">🚜</div>
        <h1 className="text-4xl font-bold text-white text-center mb-4">工程车模拟城市</h1>
        <p className="text-white/80 text-lg mb-8 text-center">建造你的梦想城市</p>
        <button
          onClick={startGame}
          className="px-8 py-4 bg-yellow-400 text-gray-900 font-bold text-2xl rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          开始游戏
        </button>
      </div>
    );
  }

  const progress = (gameState.taskProgress / currentTask.target) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-sky-300">
      {/* Top Bar */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between text-white">
        <Link href="/ideas" className="text-white/80 hover:text-white">← 返回</Link>
        <div className="flex items-center gap-2">
          <span className="text-xl">⭐</span>
          <span className="text-xl font-bold">{gameState.score}</span>
        </div>
        <div className="flex-1 max-w-xs mx-4">
          <div className="text-xs opacity-80 mb-1">
            {currentTask.name} {currentTask.emoji}
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="text-sm opacity-80">
          🔒 {gameState.unlockedVehicles.length}/5
        </div>
        <button onClick={resetGame} className="ml-2 text-white/60 hover:text-white text-sm">
          重置
        </button>
      </div>

      {/* Game Scene */}
      <div
        ref={sceneRef}
        className="flex-1 relative overflow-hidden select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Clouds */}
        <div className="absolute top-10 left-10 w-20 h-10 bg-white/80 rounded-full" />
        <div className="absolute top-16 left-64 w-16 h-8 bg-white/70 rounded-full" />
        <div className="absolute top-8 right-20 w-24 h-12 bg-white/90 rounded-full" />

        {/* Grass */}
        <div className="absolute bottom-[35%] left-0 right-0 h-8 bg-green-600" />

        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gradient-to-b from-amber-800 to-amber-950" />

        {/* Road */}
        <div className="absolute bottom-[18%] left-[8%] right-[8%] h-[22%] bg-gray-700 rounded-xl border-4 border-gray-500">
          <div className="absolute top-1/2 -translate-y-1/2 left-[12%] w-10 h-2 bg-yellow-400 rounded" />
          <div className="absolute top-1/2 -translate-y-1/2 left-[36%] w-10 h-2 bg-yellow-400 rounded" />
          <div className="absolute top-1/2 -translate-y-1/2 left-[60%] w-10 h-2 bg-yellow-400 rounded" />
        </div>

        {/* Buildings */}
        <div className="absolute bottom-[35%] left-[12%]">
          <div className="w-14 h-20 bg-red-400 border-4 border-gray-800 rounded-t-lg">
            <div className="flex flex-wrap p-1 gap-1">
              {[0, 1, 2, 3].map(i => <div key={i} className="w-4 h-4 bg-yellow-300 rounded" />)}
            </div>
          </div>
        </div>
        <div className="absolute bottom-[35%] left-[30%]">
          <div className="w-16 h-32 bg-blue-400 border-4 border-gray-800 rounded-t-lg">
            <div className="flex flex-wrap p-2 gap-1">
              {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="w-5 h-5 bg-yellow-300 rounded" />)}
            </div>
          </div>
        </div>
        <div className="absolute bottom-[35%] right-[15%]">
          <div className="w-12 h-24 bg-purple-400 border-4 border-gray-800 rounded-t-lg">
            <div className="flex flex-wrap p-1 gap-1">
              {[0, 1, 2, 3].map(i => <div key={i} className="w-4 h-4 bg-yellow-300 rounded" />)}
            </div>
          </div>
        </div>

        {/* Task item */}
        <div
          className={`absolute cursor-pointer transition-all duration-300 ${
            collectAnim ? 'scale-150 opacity-0' : 'animate-bounce'
          } ${isNearTask ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
          style={{
            bottom: `${taskPosition.y}%`,
            left: `${taskPosition.x}%`,
            transform: 'translate(-50%, 50%)',
            fontSize: '3.5rem',
          }}
          onClick={handleTaskClick}
        >
          {currentTask.emoji}
        </div>

        {/* Particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute text-2xl animate-ping pointer-events-none"
            style={{
              bottom: `${p.y}%`,
              left: `${p.x}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {p.emoji}
          </div>
        ))}

        {/* Vehicle */}
        <div
          className={`absolute cursor-grab active:cursor-grabbing transition-all duration-75 ${
            isDragging ? 'scale-110 z-50' : ''
          } ${isNearTask ? 'drop-shadow-[0_0_20px_rgba(255,217,61,0.8)]' : ''}`}
          style={{
            bottom: `${vehiclePosition.y}%`,
            left: `${vehiclePosition.x}%`,
            transform: 'translate(-50%, 50%)',
            fontSize: '5rem',
            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))',
            touchAction: 'none',
          }}
          onPointerDown={handlePointerDown}
        >
          {currentVehicle?.emoji || '🚜'}
        </div>

        {/* Hint popup */}
        <div
          className={`absolute top-1/3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-6 py-3 rounded-full text-lg font-bold transition-all duration-300 ${
            showHint ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
        >
          {hint}
        </div>

        {/* Proximity indicator */}
        {isNearTask && (
          <div className="absolute bottom-[25%] left-1/2 -translate-x-1/2 text-white/80 text-sm animate-pulse">
            👆 点击任务物品收集！
          </div>
        )}
      </div>

      {/* Vehicle Panel */}
      <div className="bg-gray-800 px-4 py-3 flex gap-3 justify-center">
        {VEHICLES.map(vehicle => {
          const isUnlocked = gameState.unlockedVehicles.includes(vehicle.id);
          const isActive = selectedVehicle === vehicle.id;
          return (
            <button
              key={vehicle.id}
              onClick={() => isUnlocked && setSelectedVehicle(vehicle.id)}
              className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 ${
                isActive ? 'bg-yellow-400/20 border-2 border-yellow-400' : 'bg-white/10 border-2 border-transparent'
              } ${!isUnlocked ? 'opacity-40 grayscale' : ''}`}
            >
              <span className="text-3xl">{isUnlocked ? vehicle.emoji : '🔒'}</span>
              <span className="text-[10px] text-white mt-0.5">{vehicle.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
