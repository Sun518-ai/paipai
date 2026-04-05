# TodoMVC Dark Mode — PRD

## 1. Concept & Vision

为 TodoMVC 页面添加深色模式支持，让用户在任何光线环境下都能舒适地管理待办事项。深色模式应与现有浅色风格保持一致的视觉语言和品牌感，同时提供流畅的系统跟随和手动切换体验。

**品牌色系延续：** 保持现有的靛蓝/紫色渐变主色调，深色模式下调整为暗色系背景。

## 2. Design Language

### 色彩体系（CSS Variables）

| Token | Light Mode | Dark Mode |
|---|---|---|
| `--bg-primary` | `#f8fafc` (slate-50) | `#0f172a` (slate-900) |
| `--bg-secondary` | `#ffffff` | `#1e293b` (slate-800) |
| `--bg-gradient-start` | `#eef2ff` (indigo-50) | `#1e1b4b` (indigo-950) |
| `--bg-gradient-mid` | `#ffffff` | `#1e293b` (slate-800) |
| `--bg-gradient-end` | `#faf5ff` (purple-50) | `#2e1065` (purple-950) |
| `--text-primary` | `#0f172a` (slate-900) | `#f1f5f9` (slate-100) |
| `--text-secondary` | `#64748b` (slate-500) | `#94a3b8` (slate-400) |
| `--text-muted` | `#cbd5e1` (slate-300) | `#475569` (slate-600) |
| `--border` | `#e2e8f0` (slate-200) | `#334155` (slate-700) |
| `--accent` | `#6366f1` (indigo-500) | `#818cf8` (indigo-400) |
| `--accent-hover` | `#4f46e5` (indigo-600) | `#a5b4fc` (indigo-300) |
| `--danger` | `#ef4444` (red-500) | `#f87171` (red-400) |

### Typography
- 系统字体栈：`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- 不引入额外字体，保持轻量化

### Motion
- 主题切换使用 `transition` 过渡（150ms），颜色切换平滑
- 无额外动画，避免过度设计

## 3. Layout & Structure

### 页面结构（不变）
```
├── Back Link + Lang Toggle Row
│   ├── Back Link (← 返回)
│   ├── Lang Toggle (中/EN)
│   └── 🌙 Dark Mode Toggle (新增)
├── Title Block
│   ├── Emoji + H1
│   └── Subtitle
├── Input Row
│   ├── Text Input
│   └── Add Button
├── Filter Tabs
│   ├── All (n)
│   ├── Active (n)
│   └── Done (n)
├── Todo List (card)
└── Footer Stats
```

**Dark Mode Toggle 位置：** 与语言切换按钮并排，位于右上角。

## 4. Features & Interactions

### 核心功能

#### 4.1 系统跟随模式
- 首次访问时，读取 `window.matchMedia('(prefers-color-scheme: dark)')` 获取系统偏好
- 不存储时，默认跟随系统

#### 4.2 手动切换
- 点击 🌙 图标按钮在 Light ↔ Dark 之间切换
- 切换后立即应用，同时存储到 `localStorage`（key: `paipai-todomcv-theme`）
- 后续访问以存储值为准（覆盖系统设置）

#### 4.3 偏好持久化
- `localStorage` key: `paipai-todomcv-theme`
- 允许值: `'light' | 'dark' | 'system'`
- `'system'` 表示跟随系统，不存储具体色值

#### 4.4 主题切换 UI
- 🌙 Moon 图标 = 当前是 light mode，点此切换到 dark
- ☀️ Sun 图标 = 当前是 dark mode，点此切换到 light
- 按钮旁显示当前模式文字提示（可选）

### 状态与边界
- 输入框 placeholder 颜色随主题变化
- 空列表提示文字颜色随主题变化
- 危险操作（删除）hover 颜色随主题变化

## 5. Component Inventory

### ThemeToggle Button
- **外观：** 圆形/胶囊按钮，图标居中（🌙 或 ☀️）
- **Hover：** 轻微背景色变化
- **位置：** 与语言切换按钮并排
- **无禁用状态**

### 颜色应用规则（Tailwind class 映射）
| 元素 | Light Mode Class | Dark Mode Class |
|---|---|---|
| 页面背景 | `bg-gradient-to-br from-indigo-50 via-white to-purple-50` | 需 CSS 变量方案 |
| 卡片背景 | `bg-white` | `dark:bg-slate-800` |
| 页面文字 | `text-gray-900` | `dark:text-slate-100` |
| 次要文字 | `text-gray-500` | `dark:text-slate-400` |
| 边框 | `border-gray-200` / `border-gray-100` | `dark:border-slate-700` |
| 输入框 | `border-gray-200 bg-white` | `dark:bg-slate-800 dark:border-slate-600` |
| 主按钮 | `bg-indigo-500 hover:bg-indigo-600 text-white` | `dark:bg-indigo-600 dark:hover:bg-indigo-500` |
| Filter 激活 | `bg-indigo-500 text-white` | `dark:bg-indigo-600 dark:text-white` |
| Filter 非激活 | `text-gray-500` | `dark:text-slate-400` |
| 勾选完成 | `bg-green-500 border-green-500` | 同（绿色保持） |
| 危险操作 hover | `hover:text-red-400` | `dark:hover:text-red-400` |

## 6. Technical Approach

### 技术栈
- **Next.js 16** (App Router, `'use client'` component)
- **React Context** — `ThemeContext` 跨组件共享主题状态
- **localStorage** — 持久化用户偏好
- **Tailwind CSS v4** — `@media (prefers-color-scheme: dark)` + `.dark` class 策略

### 实现策略
1. **CSS 变量方案（首选）：** 在 `globals.css` 中定义 CSS 变量，用 `[data-theme='dark']` 选择器覆盖。这样 Tailwind 的任意颜色 class 都能响应主题。
2. **Context:** `ThemeContext` 提供 `{ theme, toggleTheme, resolvedTheme }`
3. **Hydration 处理:** 防止 SSR/CSR 不一致导致闪烁

### 文件变更
- `src/app/globals.css` — 添加 dark mode CSS 变量和 `[data-theme='dark']` 覆盖
- `src/app/ideas/todomcv/page.tsx` — 添加 ThemeContext、dark mode toggle 按钮、更新所有颜色 class

### API/存储
- 无后端 API
- `localStorage` key: `paipai-todomcv-theme`
