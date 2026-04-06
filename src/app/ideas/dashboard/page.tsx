'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadHybrid, saveHybrid } from '@/lib/localStore';

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = 'P0' | 'P1' | 'P2' | 'P3';

interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  updatedAt?: number;
  pinned: boolean;
  priority: Priority;
}

interface DailyCheckin {
  lastDate: string; // 'YYYY-MM-DD'
  streak: number;
}

interface DayLog {
  date: string; // 'YYYY-MM-DD'
  count: number;
}

type WeeklyLog = DayLog[];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDayStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isToday(timestamp: number): boolean {
  return getDayStr(new Date(timestamp)) === getTodayStr();
}

function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function updateStreakOnAccess(prev: DailyCheckin | null): DailyCheckin {
  const today = getTodayStr();
  const yesterday = getYesterdayStr();
  if (!prev) return { lastDate: today, streak: 1 };
  if (prev.lastDate === today) return prev;
  if (prev.lastDate === yesterday) return { lastDate: today, streak: prev.streak + 1 };
  // 断签超过一天，重置
  return { lastDate: today, streak: 1 };
}

function buildWeeklyLog(past: WeeklyLog): WeeklyLog {
  const today = getTodayStr();
  const days: WeeklyLog = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = getDayStr(d);
    const existing = past.find(l => l.date === dayStr);
    days.push(existing || { date: dayStr, count: 0 });
  }
  return days;
}

// ─── Ring Progress ────────────────────────────────────────────────────────────

function RingProgress({ percent, size = 80, strokeWidth = 8 }: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(percent, 0) / 100, 1));
  const color = percent >= 100 ? '#22c55e' : percent > 0 ? '#6366f1' : '#9ca3af';

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" strokeWidth={strokeWidth}
        className="stroke-gray-200 dark:stroke-slate-700"
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        stroke={color}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  subValue,
  accent,
  ring,
  children,
}: {
  icon: string;
  label: string;
  value: string;
  subValue?: string;
  accent?: string;
  ring?: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm
        hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex flex-col items-center text-center gap-2"
    >
      <div className="text-3xl">{icon}</div>
      <div className="text-sm text-gray-500 dark:text-slate-400 font-medium">{label}</div>
      <div className="flex flex-col items-center gap-1">
        {ring !== undefined ? (
          <div className="relative">
            <RingProgress percent={ring} size={72} strokeWidth={7} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-black text-gray-800 dark:text-slate-100">{value}</span>
            </div>
          </div>
        ) : (
          <span
            className="text-4xl font-black text-gray-800 dark:text-slate-100"
            style={accent ? { color: accent } : undefined}
          >
            {value}
          </span>
        )}
        {subValue && (
          <span className="text-xs text-gray-400 dark:text-slate-500">{subValue}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Streak Card ─────────────────────────────────────────────────────────────

function StreakProgressBar({ percent, streak }: { percent: number; streak: number }) {
  return (
    <div className="w-full mt-2">
      <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500 mb-1">
        <span>🔥 连续 {streak} 天</span>
        <span>目标 30 天</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-amber-400 transition-all duration-500"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Weekly Chart ─────────────────────────────────────────────────────────────

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_LABELS[(d.getDay() + 6) % 7]; // 周一=0
}

function WeeklyChart({ data }: { data: WeeklyLog }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300 mb-4">📈 近 7 天完成趋势</h3>
      <div className="flex items-end gap-2 h-24">
        {data.map((day, i) => {
          const heightPct = day.count > 0 ? (day.count / maxCount) * 100 : 4;
          const isToday = day.date === getTodayStr();
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex flex-col items-center justify-end h-16">
                {day.count > 0 && (
                  <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium mb-0.5">
                    {day.count}
                  </span>
                )}
                <div
                  className={`w-full rounded-sm transition-all duration-500 ${
                    day.count > 0
                      ? 'bg-gradient-to-t from-indigo-500 to-purple-400'
                      : 'bg-gray-100 dark:bg-slate-700'
                  } ${isToday ? 'ring-2 ring-indigo-400 ring-offset-1 dark:ring-offset-slate-800' : ''}`}
                  style={{ height: `${heightPct}%`, minHeight: day.count > 0 ? '4px' : '4px' }}
                />
              </div>
              <span className={`text-xs ${isToday ? 'text-indigo-500 dark:text-indigo-400 font-semibold' : 'text-gray-400 dark:text-slate-500'}`}>
                {getDayLabel(day.date)}
              </span>
            </div>
          );
        })}
      </div>
      {data.every(d => d.count === 0) && (
        <p className="text-center text-gray-400 dark:text-slate-500 text-sm mt-4">
          还没有数据，开始完成任务吧！💪
        </p>
      )}
    </div>
  );
}

// ─── Recent Tasks ─────────────────────────────────────────────────────────────

function RecentTasks({ todos }: { todos: Todo[] }) {
  const recent = useMemo(
    () =>
      todos
        .filter(t => t.done && t.updatedAt)
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
        .slice(0, 5),
    [todos]
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300 mb-3">📌 最近完成的任务</h3>
      {recent.length === 0 ? (
        <p className="text-center text-gray-400 dark:text-slate-500 text-sm py-4">
          还没有完成任何任务，开始行动吧！💪
        </p>
      ) : (
        <ul className="space-y-2">
          {recent.map(todo => (
            <li
              key={todo.id}
              className="flex items-start gap-2 py-2 border-b border-gray-50 dark:border-slate-700/50 last:border-0"
            >
              <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-700 dark:text-slate-200 line-clamp-1">
                  {todo.text}
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-500 ml-2">
                  {todo.updatedAt ? relativeTime(todo.updatedAt) : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Achievement Badge ────────────────────────────────────────────────────────

function AchievementBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;
  if (streak >= 30) return <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">🏆 月度达人！</span>;
  if (streak >= 14) return <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">🌟 双周成就！</span>;
  if (streak % 7 === 0) return <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">🎉 周成就！</span>;
  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [checkin, setCheckin] = useState<DailyCheckin | null>(null);
  const [weeklyLog, setWeeklyLog] = useState<WeeklyLog>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load all data
  useEffect(() => {
    Promise.all([
      loadHybrid<Todo[]>('paipai-todos', []),
      loadHybrid<number>('paipai-pomodoro-count', 0),
      loadHybrid<DailyCheckin | null>('paipai-daily-checkin', null),
      loadHybrid<WeeklyLog>('paipai-weekly-log', []),
    ]).then(([t, p, c, w]) => {
      setTodos(t);
      setPomodoroCount(p);
      // Auto-update streak on access
      const updated = updateStreakOnAccess(c);
      setCheckin(updated);
      saveHybrid('paipai-daily-checkin', updated);
      // Build full 7-day log
      setWeeklyLog(buildWeeklyLog(w));
      setHydrated(true);
    });
  }, []);

  // Track completed todos and update weekly log
  const prevDoneRef = useMemo(() => new Set<string>(), []);
  useEffect(() => {
    if (!hydrated) return;
    const today = getTodayStr();
    const doneToday = todos.filter(t => t.done && t.updatedAt && isToday(t.updatedAt));
    const doneIds = new Set(doneToday.map(t => t.id));

    // Check if any NEW tasks were completed today
    let hasNewCompletion = false;
    for (const id of doneIds) {
      if (!prevDoneRef.has(id)) {
        hasNewCompletion = true;
        break;
      }
    }

    if (hasNewCompletion) {
      // Update weekly log
      setWeeklyLog(prev => {
        const existing = prev.find(l => l.date === today);
        let next: WeeklyLog;
        if (existing) {
          next = prev.map(l => l.date === today ? { ...l, count: l.count + 1 } : l);
        } else {
          next = [{ date: today, count: 1 }, ...prev].slice(0, 7);
        }
        saveHybrid('paipai-weekly-log', next);
        return next;
      });

      // Auto check-in if not done today
      if (checkin?.lastDate !== today) {
        const updated = { lastDate: today, streak: (checkin?.lastDate === getYesterdayStr() ? (checkin?.streak ?? 0) : 0) + 1 };
        setCheckin(updated);
        saveHybrid('paipai-daily-checkin', updated);
      }
    }

    // Update ref
    prevDoneRef.clear();
    for (const id of doneIds) prevDoneRef.add(id);
  }, [todos, hydrated]);

  // Computed stats
  const completionRate = useMemo(() => {
    if (todos.length === 0) return 0;
    return Math.round((todos.filter(t => t.done).length / todos.length) * 100);
  }, [todos]);

  const focusMinutes = pomodoroCount * 25;
  const focusDisplay = useMemo(() => {
    if (focusMinutes === 0) return { value: '0', unit: '分钟', full: '0分钟' };
    if (focusMinutes < 60) return { value: String(focusMinutes), unit: '分钟', full: `${focusMinutes}分钟` };
    const h = Math.floor(focusMinutes / 60);
    const m = focusMinutes % 60;
    return { value: `${h}h${m > 0 ? m + 'm' : ''}`, unit: '小时', full: `${h}小时${m > 0 ? m + '分钟' : ''}` };
  }, [focusMinutes]);

  const streak = checkin?.streak ?? 0;
  const streakPct = Math.round((streak / 30) * 100);

  const pomodoroEmoji = pomodoroCount === 0 ? '🍅' : pomodoroCount < 4 ? '🌱' : pomodoroCount < 8 ? '🔥' : '⭐';

  const bgStyle = {
    background: `linear-gradient(to bottom right, var(--bg-gradient-start), var(--bg-gradient-mid), var(--bg-gradient-end))`,
  };

  return (
    <div className="min-h-screen" style={bgStyle}>
      {/* Header */}
      <div className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-end">
        <Link
          href="/"
          className="mr-auto inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium transition-colors"
        >
          ← 返回点子站
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Title */}
        <div className="text-center">
          <span className="text-5xl mb-3 block">📊</span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">数据看板</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">你的每一次坚持，都值得被记录 ✨</p>
        </div>

        {/* Stat Cards Row 1 */}
        <div className="grid grid-cols-2 gap-4">
          {/* Completion Rate */}
          <StatCard
            icon="📋"
            label="任务完成率"
            value={todos.length === 0 ? '--' : `${completionRate}%`}
            subValue={todos.length === 0 ? '暂无任务' : `${todos.filter(t => t.done).length} / ${todos.length} 项`}
            ring={todos.length === 0 ? 0 : completionRate}
          />

          {/* Focus Time */}
          <StatCard
            icon={pomodoroEmoji}
            label="累计专注时长"
            value={focusDisplay.value}
            subValue={focusDisplay.full}
            accent="#f87171"
          >
            <div className="flex gap-1 mt-1">
              {pomodoroCount > 0 && Array.from({ length: Math.min(pomodoroCount, 12) }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-gradient-to-br from-red-400 to-orange-400" />
              ))}
              {pomodoroCount > 12 && (
                <span className="text-xs text-gray-400 self-center ml-0.5">+{pomodoroCount - 12}</span>
              )}
            </div>
          </StatCard>
        </div>

        {/* Streak Card */}
        <StatCard
          icon="🔥"
          label="连续打卡"
          value={streak === 0 ? '还没有开始' : `${streak} 天`}
          subValue={streak === 0 ? '完成首个任务即可开始记录' : `目标 30 天`}
          accent="#f59e0b"
        >
          {streak > 0 && <StreakProgressBar percent={streakPct} streak={streak} />}
          {streak > 0 && <AchievementBadge streak={streak} />}
          {streak === 0 && (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">🎯 完成今天的第一个任务吧！</p>
          )}
        </StatCard>

        {/* Weekly Chart */}
        <WeeklyChart data={weeklyLog} />

        {/* Recent Tasks */}
        <RecentTasks todos={todos} />

        {/* Footer hint */}
        <div className="text-center text-xs text-gray-400 dark:text-slate-500 pt-2">
          <p>数据基于本地存储 · 开启任务和番茄钟以积累数据 📈</p>
        </div>
      </div>
    </div>
  );
}
