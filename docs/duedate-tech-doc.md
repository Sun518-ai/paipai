# 📅 到期提醒功能 Tech Doc

## 1. 修改文件清单

- `src/app/ideas/todomcv/page.tsx` — 主要实现

## 2. 数据模型变更

### 2.1 Todo 接口扩展

```typescript
interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  pinned: boolean;
  dueDate: number | null; // 新增：截止日期时间戳(ms)，无则为 null
}
```

### 2.2 新增类型

```typescript
type DueStatus = 'normal' | 'dueSoon' | 'overdue';
```

## 3. 核心逻辑

### 3.1 获取任务到期状态

```typescript
function getDueStatus(todo: Todo): DueStatus {
  if (todo.done || todo.dueDate === null) return 'normal';
  const now = Date.now();
  const diff = todo.dueDate - now;
  if (diff < 0) return 'overdue';       // 已过期
  if (diff <= 24 * 60 * 60 * 1000) return 'dueSoon'; // ≤24小时
  return 'normal';
}
```

### 3.2 格式化日期显示

```typescript
function formatDueDate(timestamp: number, lang: Lang): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.round((timestamp - now.getTime()) / (24*60*60*1000));
  
  if (diffDays === 0) return translations[lang].today;
  if (diffDays === 1) return translations[lang].tomorrow;
  if (diffDays === -1) return lang === 'zh' ? '昨天' : 'Yesterday';
  
  return due.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
}
```

### 3.3 排序逻辑

```typescript
.sort((a, b) => {
  // 1. 置顶优先
  if (a.pinned && !b.pinned) return -1;
  if (!a.pinned && b.pinned) return 1;
  
  // 2. 过期任务优先（按过期时间升序）
  const statusA = getDueStatus(a);
  const statusB = getDueStatus(b);
  if (statusA === 'overdue' && statusB !== 'overdue') return -1;
  if (statusB === 'overdue' && statusA !== 'overdue') return 1;
  
  // 3. 即将到期其次
  if (statusA === 'dueSoon' && statusB === 'normal') return -1;
  if (statusB === 'dueSoon' && statusA === 'normal') return 1;
  
  // 4. 按截止日期升序（无日期排最后）
  if (a.dueDate !== null && b.dueDate !== null) return a.dueDate - b.dueDate;
  if (a.dueDate !== null) return -1;
  if (b.dueDate !== null) return 1;
  
  // 5. 最后按创建时间倒序
  return b.createdAt - a.createdAt;
});
```

## 4. UI 变更

### 4.1 视觉样式

| 状态 | 样式 |
|------|------|
| 临近到期 | `bg-amber-50 dark:bg-amber-900/10 border-l-4 border-l-amber-400` |
| 已过期 | `bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-500` |

### 4.2 日期选择器

使用原生 `<input type="date">`，通过隐藏的 input + 按钮触发 `showPicker()`。

### 4.3 新增过滤器

```tsx
{(['all', 'active', 'done', 'dueSoon'] as const).map((f) => ...)}
```

## 5. 国际化

```typescript
zh: {
  setDueDate: '设定日期',
  clearDueDate: '清除日期',
  filterDueSoon: '即将到期',
  emptyDueSoon: '🎉 没有即将到期的任务',
  today: '今天',
  tomorrow: '明天',
}
en: {
  setDueDate: 'Set due date',
  clearDueDate: 'Clear date',
  filterDueSoon: 'Due Soon',
  emptyDueSoon: '🎉 No tasks due soon',
  today: 'Today',
  tomorrow: 'Tomorrow',
}
```

## 6. 构建

- `npm run build` 通过
- TypeScript 严格模式
- 无新增依赖
