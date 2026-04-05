# Pomodoro Timer 技术文档

## 技术方案

### 状态管理

使用 React `useState` + `useEffect` 管理计时器状态：

```typescript
type Phase = 'work' | 'break';
type Status = 'idle' | 'running' | 'paused';

// 状态
const [phase, setPhase] = useState<Phase>('work');
const [status, setStatus] = useState<Status>('idle');
const [timeLeft, setTimeLeft] = useState(25 * 60); // 秒数
const [completedCount, setCompletedCount] = useState(0);
```

### 定时器实现

- 使用 `setInterval` 每秒递减 `timeLeft`
- `useEffect` 依赖 `[status]` 动态创建/清除 interval
- 计时结束（`timeLeft === 0`）时：
  - 发送浏览器通知
  - 播放提示音效（可选）
  - 切换 phase（work → break 或 break → work）
  - 重置时间（work: 25min, break: 5min）

### localStorage 持久化

```typescript
// 存储今日完成次数
useEffect(() => {
  saveHybrid('paipai-pomodoro-count', completedCount);
}, [completedCount]);

// 加载今日数据
useEffect(() => {
  loadHybrid<number>('paipai-pomodoro-count', 0).then(setCompletedCount);
}, []);
```

### 浏览器通知

```typescript
// 请求权限（首次）
if (Notification.permission === 'default') {
  await Notification.requestPermission();
}
// 发送通知
if (Notification.permission === 'granted') {
  new Notification('🍅 番茄钟', { body: '专注时间结束，开始休息吧！' });
}
```

### 圆形进度条

使用 SVG `circle` 元素 + `stroke-dasharray` / `stroke-dashoffset` 实现：

```tsx
const circumference = 2 * Math.PI * radius;
const progress = timeLeft / totalTime; // 0~1
const offset = circumference * (1 - progress);

<svg ...>
  <circle
    strokeDasharray={circumference}
    strokeDashoffset={offset}
    ...
  />
</svg>
```

---

## 组件结构

```
src/app/ideas/pomodoro/
└── page.tsx       # 完整页面（'use client'）
```

页面内嵌组件（无需独立拆分）：
- `TimerDisplay` — 圆形进度条 + 时间显示
- `Controls` — 开始/暂停/重置按钮
- `Stats` — 完成次数统计

---

## 文件变更清单

| 操作 | 路径 |
|------|------|
| **新增** | `docs/pomodoro-prd.md` |
| **新增** | `docs/pomodoro-tech-doc.md` |
| **新增** | `src/app/ideas/pomodoro/page.tsx` |

---

## API / Hooks

无外部 API 调用，纯前端实现。

依赖项目已有工具：
- `loadHybrid<T>()` — 从 localStorage 异步读取
- `saveHybrid()` — 写入 localStorage

---

## 样式方案

- Tailwind CSS（与项目一致）
- 配色：工作阶段红色系（from-red-400 to-orange-500），休息阶段绿色系（from-green-400 to-teal-500）
- 页面背景：`bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50`
- 返回链接和页面结构与现有 ideas 页面保持一致
