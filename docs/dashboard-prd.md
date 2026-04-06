# 数据看板 — Product Requirements Document

## 1. Concept & Vision

**是什么：** 一个激励型个人数据看板，聚合 TodoMVC 任务完成数据 + 番茄钟专注数据 + 连续打卡天数，用清晰的数字卡片和进度展示让用户直观感受自己的坚持与进步。

**核心理念：** 数据不是冷冰冰的数字，而是每一次坚持的记录。打卡天数是最强的心理锚点——人们不愿意中断一条连续曲线。

**情感目标：** 让用户看到"我已经坚持了 X 天"时产生满足感和不想断掉的动力。

## 2. Design Language

### 2.1 Aesthetic Direction
参考 Notion Dashboard + Linear 的视觉风格：大量留白、数字突出、渐变背景强调主题感。

### 2.2 Color Palette
- Primary: `#6366f1` (Indigo)
- Secondary: `#8b5cf6` (Purple)
- Accent: `#f59e0b` (Amber — 用于 streak 高亮)
- Background: 靛蓝→紫色渐变（同现有项目风格）
- Dark mode: 深靛蓝/紫色渐变

### 2.3 Typography
- 数字: 超大号粗体（text-6xl font-black）
- 标签: 小号灰色文字（text-sm text-gray-500）
- 中文字体: 系统默认（-apple-system）

### 2.4 Motion
- 数字加载时从 0 滚动到目标值（CSS counter 或 JS 动画，400ms ease-out）
- 卡片进入时淡入 + 上移（opacity 0→1, translateY 20px→0, 300ms）

### 2.5 Visual Assets
- 图标: Emoji（📋 🍅 🔥 ⭐）
- 装饰: 渐变背景、圆角卡片、轻柔阴影

## 3. Layout & Structure

### 3.1 Page Structure
```
┌─────────────────────────────────┐
│  ← 返回点子站        深色模式切换  │  Header
├─────────────────────────────────┤
│                                 │
│    📊 数据看板                   │  Title
│    你的每一次坚持，都值得被记录     │  Subtitle
│                                 │
│  ┌─────────┐ ┌─────────┐       │
│  │ 📋     │ │ 🍅     │       │  Stat Card 1 & 2
│  │ 完成率  │ │ 专注时长 │       │
│  │  75%   │ │ 12h 30m│       │
│  └─────────┘ └─────────┘       │
│                                 │
│  ┌─────────┐                   │
│  │ 🔥     │                   │  Stat Card 3 (Streak)


│  │ 连续打卡 │                   │
│  │  7 天   │                   │
│  │ ─────── │                   │  Streak progress bar
│  │ 目标: 30天│                   │
│  └─────────┘                   │
│                                 │
│  ┌──────────────────────────┐  │
│  │  近 7 天完成趋势           │  │  Weekly Chart


│  │  ██ ██ █  ██ ██ ██ ██    │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │  📌 最近完成的任务          │  │  Recent Completions


│  │  · 设计数据看板 UI         │  │
│  │  · 编写 PRD 文档          │  │
│  └──────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

### 3.2 Responsive Strategy
- 单列布局，最大宽度 2xl（max-w-2xl）
- 移动端：卡片垂直堆叠
- 桌面端：前两个 stat cards 并排

## 4. Features & Interactions

### 4.1 完成率卡片
- **数据来源:** `paipai-todos` localStorage key
- **计算:** 已完成任务数 / 总任务数 × 100%
- **显示:** 百分比数字 + 环形进度条
- **状态:**
  - 空（无任务）: 显示 "--"，进度条为空
  - 0%: "0%"，灰色
  - 1-99%: 正常显示，蓝色
  - 100%: "100%" + 绿色 + 🎉
- **交互:** hover 时微微放大（scale 1.02）

### 4.2 专注时长卡片
- **数据来源:** `paipai-pomodoro-count` localStorage key
- **计算:** 完成番茄数 × 25分钟 = 总分钟数
- **显示:** `X小时 Y分钟` 格式（超过60分钟显示小时）
- **状态:**
  - 0个番茄: "0分钟"，灰色
  - >0: 正常显示，番茄红渐变
- **里程碑表情:**
  - 0: 🍅
  - 1-3: 🌱
  - 4-7: 🔥
  - 8+: ⭐

### 4.3 连续打卡天数卡片
- **数据来源:** `paipai-daily-checkin` localStorage key（对象: `{lastDate: string, streak: number}`）
- **打卡规则:** 每天首次完成任务（todo标记done或番茄钟完成）时打卡
- **计算:**
  - 今天已打卡: streak 维持
  - 昨天已打卡且今天未打卡: streak 维持（但不是断签）
  - 昨天未打卡（两天以上空缺）: streak 重置为 0
  - 今天首次打卡: streak +1
- **显示:** 连续天数 + 目标进度条（默认目标 30 天）
- **状态:**
  - streak = 0: "还没有开始打卡" + 灰色
  - streak > 0: 橙色/琥珀色高亮 + 🔥 emoji
  - streak % 7 === 0: 额外 "周成就!" 标签
- **进度条:** 渐变填充，从紫色到橙色

### 4.4 近7天完成趋势
- **数据来源:** `paipai-weekly-log` localStorage key（数组，保留最近7天每天完成任务数）
- **显示:** 7个柱状图，从左到右是周一到周日（或最近7天）
- **柱子高度:** 根据当天完成数比例计算，最高柱子 = 当天最大值
- **空状态:** 全灰柱子 + "还没有数据"
- **标签:** 柱子下方显示星期缩写（周一/二/三...）

### 4.5 最近完成的任务
- **数据来源:** `paipai-todos` localStorage key
- **显示:** 最近5个已完成任务（按完成时间倒序）
- **每项:** 任务文字 + 完成时间（相对时间：N分钟前/N小时前/昨天/具体日期）
- **空状态:** "还没有完成任何任务，开始行动吧！💪"

## 5. Component Inventory

### StatCard
- Props: `icon: string, label: string, value: string, subValue?: string, color?: string`
- States: default / hover (scale 1.02) / empty (-- 显示)
- 包含环形进度条（可选）

### StreakCard (extends StatCard)
- 额外显示: 目标进度条 + 目标天数标签
- 颜色: 橙色渐变

### WeeklyBarChart
- 7个柱状条 + 底部标签
- 动态高度计算

### RecentTasksList
- 最近完成任务列表
- 每项: 文字 + 时间

## 6. Technical Approach

### 6.1 Framework
- Next.js 16 App Router
- 单个 page.tsx，'use client'
- Tailwind CSS v4

### 6.2 Data Storage
使用 localStorage，同现有项目风格：

```typescript
// Keys
'paipai-todos'            // Todo[]
'paipai-pomodoro-count'   // number
'paipai-daily-checkin'    // { lastDate: string; streak: number }
'paipai-weekly-log'       // { date: string; count: number }[]
```

### 6.3 Dark Mode
复用现有 ThemeContext，在 globals.css 中添加 dashboard 专用变量。

### 6.4 Data Refresh
所有数据在 useEffect 中从 localStorage 读取，setInterval 每分钟检查一次打卡状态（判断日期是否切换）。

### 6.5 文件结构
```
src/app/ideas/dashboard/
  page.tsx        # 主页面
src/docs/
  dashboard-prd.md
  dashboard-tech-doc.md
```

## 7. Edge Cases

- localStorage 被清除：所有数据显示为空状态
- 无任务时：完成率显示 "--"，趋势图显示空状态
- 番茄数为0：专注时长显示 "0分钟"
- streak = 0：连续打卡显示 "还没有开始打卡"
- 打卡日期跨天（凌晨12点后打开）：自动刷新 streak 判断
