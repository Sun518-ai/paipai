'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { loadHybrid, saveHybrid } from '@/lib/localStore';

type Phase = 'work' | 'break';
type Status = 'idle' | 'running' | 'paused';

const WORK_TIME = 25 * 60; // 25 minutes in seconds
const BREAK_TIME = 5 * 60; // 5 minutes in seconds

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

function requestNotificationPermission() {
  if (typeof window === 'undefined') return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

interface CircularProgressProps {
  progress: number; // 0 to 1
  size: number;
  strokeWidth: number;
  phase: Phase;
  children: React.ReactNode;
}

function CircularProgress({ progress, size, strokeWidth, phase, children }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const gradientId = 'pomodoro-gradient';
  const trackColor = phase === 'work' ? 'stroke-red-100' : 'stroke-green-100';
  const barColor = phase === 'work'
    ? 'stroke-red-400'
    : 'stroke-green-400';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {phase === 'work' ? (
              <>
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="100%" stopColor="#fb923c" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#2dd4bf" />
              </>
            )}
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={trackColor}
        />
        {/* Progress bar */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export default function PomodoroPage() {
  const [phase, setPhase] = useState<Phase>('work');
  const [status, setStatus] = useState<Status>('idle');
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [completedCount, setCompletedCount] = useState(0);
  const [notificationSupported, setNotificationSupported] = useState(false);

  const totalTime = phase === 'work' ? WORK_TIME : BREAK_TIME;
  const progress = totalTime > 0 ? timeLeft / totalTime : 1;

  // Load from localStorage
  useEffect(() => {
    loadHybrid<number>('paipai-pomodoro-count', 0).then(setCompletedCount);
    loadHybrid<{ phase: Phase; timeLeft: number }>('paipai-pomodoro-state', {
      phase: 'work',
      timeLeft: WORK_TIME,
    }).then((saved) => {
      if (saved) {
        setPhase(saved.phase);
        setTimeLeft(saved.timeLeft);
      }
    });
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationSupported(true);
    }
  }, []);

  // Save state to localStorage on change
  useEffect(() => {
    saveHybrid('paipai-pomodoro-state', { phase, timeLeft });
  }, [phase, timeLeft]);

  // Timer logic
  useEffect(() => {
    if (status !== 'running') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up
          clearInterval(timer);
          setStatus('idle');

          if (phase === 'work') {
            sendNotification('🍅 专注时间结束', '开始休息吧！休息 5 分钟 🌿');
            setCompletedCount((c) => c + 1);
            setPhase('break');
            return BREAK_TIME;
          } else {
            sendNotification('🌿 休息结束', '开始新番茄吧！🍅');
            setPhase('work');
            return WORK_TIME;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, phase]);

  const handleStart = useCallback(() => {
    requestNotificationPermission();
    setStatus('running');
  }, []);

  const handlePause = useCallback(() => {
    setStatus('paused');
  }, []);

  const handleReset = useCallback(() => {
    setStatus('idle');
    setTimeLeft(phase === 'work' ? WORK_TIME : BREAK_TIME);
  }, [phase]);

  const handleSwitchPhase = useCallback(() => {
    setStatus('idle');
    const newPhase = phase === 'work' ? 'break' : 'work';
    setPhase(newPhase);
    setTimeLeft(newPhase === 'work' ? WORK_TIME : BREAK_TIME);
  }, [phase]);

  const phaseLabel = phase === 'work' ? '专注中' : '休息中';
  const phaseEmoji = phase === 'work' ? '🍅' : '🌿';
  const bgGradient =
    phase === 'work'
      ? 'from-red-50 via-orange-50 to-yellow-50'
      : 'from-green-50 via-teal-50 to-cyan-50';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient}`}>
      {/* Back */}
      <div className="max-w-4xl mx-auto px-6 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 text-sm font-medium transition-colors"
        >
          ← 返回点子站
        </Link>
      </div>

      <div className="max-w-md mx-auto px-6 py-10 flex flex-col items-center">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🍅 番茄钟</h1>
          <p className="text-gray-500 mt-1">专注 25 分钟，休息 5 分钟 ✨</p>
        </div>

        {/* Phase badge */}
        <div
          className={`mb-6 px-4 py-1.5 rounded-full text-sm font-medium ${
            phase === 'work'
              ? 'bg-red-100 text-red-600'
              : 'bg-green-100 text-green-600'
          }`}
        >
          {phaseEmoji} {phaseLabel}
        </div>

        {/* Circular progress */}
        <CircularProgress
          progress={progress}
          size={280}
          strokeWidth={12}
          phase={phase}
        >
          <div className="text-center">
            <div className="text-5xl font-black text-gray-800 tabular-nums">
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {status === 'idle' && '点击开始'}
              {status === 'running' && '专注中...'}
              {status === 'paused' && '已暂停'}
            </div>
          </div>
        </CircularProgress>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-8">
          {status === 'idle' || status === 'paused' ? (
            <button
              onClick={handleStart}
              className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-lg shadow-md hover:shadow-lg transition-all"
            >
              {status === 'paused' ? '▶️ 继续' : '▶️ 开始'}
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="px-8 py-3 bg-yellow-400 hover:bg-yellow-500 text-white rounded-2xl font-bold text-lg shadow-md hover:shadow-lg transition-all"
            >
              ⏸️ 暂停
            </button>
          )}

          <button
            onClick={handleReset}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-2xl font-medium text-lg transition-all"
          >
            🔄 重置
          </button>
        </div>

        {/* Switch phase button */}
        <button
          onClick={handleSwitchPhase}
          className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors underline-offset-2 hover:underline"
        >
          切换到{phase === 'work' ? '休息' : '专注'}模式
        </button>

        {/* Stats */}
        <div className="mt-10 w-full">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">今日完成</p>
                <p className="text-3xl font-black text-gray-800">
                  {completedCount} <span className="text-base font-normal text-gray-400">个番茄</span>
                </p>
              </div>
              <div className="text-4xl">
                {completedCount === 0 ? '🍅' : completedCount < 4 ? '🌱' : completedCount < 8 ? '🔥' : '⭐'}
              </div>
            </div>
            {/* Progress dots */}
            <div className="mt-3 flex gap-1.5 flex-wrap">
              {Array.from({ length: Math.min(completedCount, 12) }).map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full bg-gradient-to-br from-red-400 to-orange-400"
                />
              ))}
              {completedCount > 12 && (
                <span className="text-xs text-gray-400 self-center ml-1">
                  +{completedCount - 12}
                </span>
              )}
              {completedCount === 0 && (
                <span className="text-xs text-gray-400">还没有完成任何番茄，开始专注吧！</span>
              )}
            </div>
          </div>
        </div>

        {/* Notification hint */}
        {notificationSupported && (
          <p className="mt-4 text-xs text-gray-400 text-center">
            🔔 计时结束会发送浏览器通知，请允许通知权限
          </p>
        )}
      </div>
    </div>
  );
}
