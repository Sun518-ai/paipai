# 数据看板 — Technical Design Document

## 1. Overview

实现一个激励型个人数据看板页面 `/ideas/dashboard`，展示任务完成率、专注时长、连续打卡天数和近7天完成趋势。数据全部来自 localStorage，遵循现有项目的 'use client' + loadHybrid/saveHybrid 模式。

## 2. Data Sources & Storage Schema

### 2.1 现有 Keys（只读）

```typescript
// 从 paipai-todos 读取（loadHybrid<Todo[]>('paipai-todos', [])）
interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  pinned: boolean;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

// 从 paipai-pomodoro-count 读取（loadHybrid<number>('paipai-pomodoro-count', 0)）
// number: 累计完成的番茄数
```

### 2.2 新建 Keys

```typescript
// paipai-daily-checkin: 连续打卡状态
interface DailyCheckin {
  lastDate: string;  // 'YYYY-MM-DD' 格式，最后打卡日期
  streak: number;     // 连续打卡天数
}

// paipai-weekly-log: 近7天完成记录
interface DayLog {
  date: string;   // 'YYYY-MM-DD'
  count: number;   // 完成任务数
}
type WeeklyLog = DayLog[];
```

### 2.3 Check-in Logic

```typescript
function shouldCheckinToday(lastDate: string | null): boolean {
  if (!lastDate) return true;
  const today = getTodayStr(); // 'YYYY-MM-DD'
  const yesterday = getYesterdayStr();
  // 如果上次打卡是今天，不重复打卡
  // 如果上次打卡是昨天，今天尚未打卡，可以打卡
  // 如果上次打卡超过昨天，streak 需要重置
  return lastDate !== today;
}

function updateStreak(lastCheckin: DailyCheckin | null): DailyCheckin {
  const today = getTodayStr();
  const yesterday = getYesterdayStr();
  if (!lastCheckin) {
    return { lastDate: today, streak: 1 };
  }
  if (lastCheckin.lastDate === today) {
    return lastCheckin; // 今天已打卡，不变
  }
  if (lastCheckin.lastDate === yesterday) {
    return { lastDate: today, streak: lastCheckin.streak + 1 }; // 连续打卡+1
  }
  // lastDate 更早: streak 重置
  return { lastDate: today, streak: 1 };
}
```

## 3. Component Architecture

```
DashboardPage (主组件)
├── useDataLoader (数据加载 hook)
│   ├── loadTodos() → completionRate
│   ├── loadPomodoros() → focusTime
│   ├── loadCheckin() → streak + checkin status
│   └── loadWeeklyLog() → weekly bars
├── StatCard (通用卡片)
│   ├── CompletionRateCard (完成率 + 环形图)
│   ├── FocusTimeCard (专注时长)
│   └── StreakCard (连续打卡 + 进度条)
├── WeeklyChart (近7天柱状图)
└── RecentTasksList (最近完成任务)
```

## 4. File Structure

```
src/app/ideas/dashboard/
  page.tsx        # 主页面（约300行）
```

## 5. Implementation Details

### 5.1 Ring Progress Component

```tsx
function RingProgress({ percent, size = 80, strokeWidth = 8 }: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(percent / 100, 1));
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={radius}
        fill="none" strokeWidth={strokeWidth}
        className="stroke-gray-200 dark:stroke-slate-700" />
      <circle cx={size/2} cy={size/2} r={radius}
        fill="none" strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
        style={{ stroke: percent === 100 ? '#22c55e' : '#6366f1' }} />
    </svg>
  );
}
```

### 5.2 Data Loading Hook

```typescript
function useData() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [checkin, setCheckin] = useState<DailyCheckin | null>(null);
  const [weeklyLog, setWeeklyLog] = useState<WeeklyLog>([]);

  useEffect(() => {
    // 加载所有数据
    loadHybrid<Todo[]>('paipai-todos', []).then(setTodos);
    loadHybrid<number>('paipai-pomodoro-count', 0).then(setPomodoroCount);
    loadHybrid<DailyCheckin | null>('paipai-daily-checkin', null).then((c) => {
      const updated = updateStreakOnAccess(c);
      setCheckin(updated);
      saveHybrid('paipai-daily-checkin', updated);
    });
    loadHybrid<WeeklyLog>('paipai-weekly-log', []).then(setWeeklyLog);
  }, []);

  // checkin 逻辑: 每次完成任务时调用
  const doCheckin = useCallback(() => {
    setCheckin(prev => {
      const next = updateStreak(prev);
      saveHybrid('paipai-daily-checkin', next);
      return next;
    });
    // 同时更新 weekly log
    setWeeklyLog(prev => {
      const next = addTodayLog(prev);
      saveHybrid('paipai-weekly-log', next);
      return next;
    });
  }, []);

  return { todos, pomodoroCount, checkin, weeklyLog, doCheckin };
}
```

### 5.3 Weekly Log Update

```typescript
function addTodayLog(log: WeeklyLog): WeeklyLog {
  const today = getTodayStr();
  const filtered = log.filter(l => l.date !== today); // 移除今天的旧记录
  const updated = [{ date: today, count: 1 }, ...filtered];
  // 保留最多7天
  return updated.slice(0, 7);
}

function incrementTodayLog(log: WeeklyLog): WeeklyLog {
  const today = getTodayStr();
  const existing = log.find(l => l.date === today);
  if (existing) {
    return log.map(l => l.date === today ? { ...l, count: l.count + 1 } : l);
  }
  return addTodayLog(log);
}
```

### 5.4 自动打卡触发

在 Dashboard 页面加载时自动判断是否需要打卡：
- 条件：今天有完成任何任务（todos 中有 done=true 的）且 lastDate 不是今天

```typescript
useEffect(() => {
  const today = getTodayStr();
  const hasCompletedToday = todos.some(t => t.done && isToday(t.updatedAt));
  if (hasCompletedToday && checkin?.lastDate !== today) {
    doCheckin();
  }
}, [todos, checkin]);
```

## 6. Styling

### 6.1 globals.css Additions

Dashboard 使用现有 CSS 变量系统，无需额外 CSS 变量。

### 6.2 Dark Mode

Dashboard 复用 TodoMVC 的 `[data-theme='dark']` 机制，所有颜色类使用 `dark:` Tailwind variant。

### 6.3 Animation

```tsx
// 卡片入场动画
<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
// 数字滚动动画用 CSS
@keyframes countUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.stat-value { animation: countUp 400ms ease-out; }
```

## 7. Accessibility

- 所有数字有 aria-label
- 颜色对比度符合 WCAG AA
- 支持键盘导航
- 深色模式下所有文字有足够对比度

## 8. Dependencies

无新增依赖。使用：
- React (useState, useEffect, useCallback, useMemo) — 已有
- localStorage — 已有
- Tailwind CSS — 已有
