# Tech Doc - 任务优先级功能

## 1. 概述

在现有 TodoMVC 组件中扩展优先级功能，不破坏现有架构。

## 2. 数据模型变更

**文件**: `src/app/ideas/todomcv/page.tsx`

```typescript
type Priority = 'P0' | 'P1' | 'P2' | 'P3';
<<<<<<< HEAD
=======

>>>>>>> 55ed72a (feat: add task priority levels P0-P3)
interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  pinned: boolean;
<<<<<<< HEAD
  priority: 'P0' | 'P1' | 'P2' | 'P3'; // 新增，默认 'P3'
=======
  priority: Priority; // 新增，默认 'P3'
>>>>>>> 55ed72a (feat: add task priority levels P0-P3)
}
```

## 3. 优先级配置

```typescript
const PRIORITY_CONFIG: Record<Priority, { label: string; labelEn: string; color: string; emoji: string }> = {
<<<<<<< HEAD
  P0: { label: '紧急', labelEn: 'Urgent',   color: '#EF4444', emoji: '🔴' },
  P1: { label: '高',   labelEn: 'High',     color: '#F97316', emoji: '🟠' },
  P2: { label: '中',   labelEn: 'Medium',   color: '#3B82F6', emoji: '🔵' },
  P3: { label: '低',   labelEn: 'Low',      color: '#9CA3AF', emoji: '⚪' },
};

// 优先级排序权重
=======
  P0: { label: '紧急', labelEn: 'Urgent',  color: '#EF4444', emoji: '🔴' },
  P1: { label: '高',   labelEn: 'High',    color: '#F97316', emoji: '🟠' },
  P2: { label: '中',   labelEn: 'Medium',  color: '#3B82F6', emoji: '🔵' },
  P3: { label: '低',   labelEn: 'Low',     color: '#9CA3AF', emoji: '⚪' },
};

>>>>>>> 55ed72a (feat: add task priority levels P0-P3)
const PRIORITY_ORDER: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
```

## 4. 翻译文案变更

在 `translations` 对象中新增优先级相关文案：

```typescript
const translations = {
  zh: {
<<<<<<< HEAD
    // ... 现有字段
=======
>>>>>>> 55ed72a (feat: add task priority levels P0-P3)
    priority: '优先级',
    priorityUrgent: '紧急',
    priorityHigh: '高',
    priorityMedium: '中',
    priorityLow: '低',
  },
  en: {
<<<<<<< HEAD
    // ... 现有字段
=======
>>>>>>> 55ed72a (feat: add task priority levels P0-P3)
    priority: 'Priority',
    priorityUrgent: 'Urgent',
    priorityHigh: 'High',
    priorityMedium: 'Medium',
    priorityLow: 'Low',
  },
};
```

## 5. 排序逻辑变更

```typescript
// sort 函数改为综合排序：置顶 > 优先级 > 创建时间
.sort((a, b) => {
  if (a.pinned && !b.pinned) return -1;
  if (!a.pinned && b.pinned) return 1;
  if (a.priority !== b.priority) {
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  }
  return b.createdAt - a.createdAt;
});
```

<<<<<<< HEAD
## 6. 新增函数

- `setPriority(id, priority)` - 设置任务优先级
- `PrioritySelector` - 优先级选择下拉组件（点击优先级图标展开）

## 7. 组件变更

### TodoItem 行内新增

```tsx
// 优先级选择器
<button
  onClick={() => togglePriorityMenu(todo.id)}
  style={{ color: PRIORITY_CONFIG[todo.priority].color }}
  title={t.priority}
>
  {PRIORITY_CONFIG[todo.priority].emoji}
</button>

// P0 任务加粗 + 红色左边线
<li className={`... ${todo.priority === 'P0' ? 'border-l-4 border-red-500' : ''}`}>
```

### 优先级下拉菜单

- 绝对定位在优先级按钮下方
- 4 个选项，点击后调用 `setPriority`
- 点击外部关闭（onBlur 或 document click listener）

## 8. 新增状态

```typescript
const [priorityMenuOpen, setPriorityMenuOpen] = useState<string | null>(null);
```

## 9. 默认值变更

```typescript
// addTodo 中新增任务默认 priority 为 'P3'
{ id: genId(), text, done: false, pinned: false, createdAt: Date.now(), priority: 'P3' }
```

## 10. 构建要求
=======
## 6. 新增组件

### PrioritySelector

```typescript
function PrioritySelector({
  todoId,
  currentPriority,
  onSelect,
  onClose,
}: {
  todoId: string;
  currentPriority: Priority;
  onSelect: (id: string, p: Priority) => void;
  onClose: () => void;
})
```

- 绝对定位的下拉菜单
- 点击外部自动关闭（document mousedown listener）
- 4 个优先级选项，带颜色图标和本地化名称

## 7. 新增状态

```typescript
const [priorityMenuOpen, setPriorityMenuOpen] = useState<string | null>(null);
```

## 8. 新增函数

- `setPriority(id, priority)` - 设置任务优先级

## 9. 任务行变更

- checkbox 左侧新增优先级按钮（带颜色 emoji）
- P0 任务行：红色左边线 `border-l-4 border-red-500`
- P0 任务文字加粗 `font-semibold`
- 点击优先级按钮展开 PrioritySelector 下拉菜单

## 10. 默认值变更

```typescript
// addTodo 中新增任务默认 priority 为 'P3'
{ id: genId(), text, done: false, pinned: false, createdAt: Date.now(), priority: 'P3' as Priority }
```

## 11. 构建要求
>>>>>>> 55ed72a (feat: add task priority levels P0-P3)

- 所有新增代码使用 TypeScript 严格模式
- 不引入新的 npm 依赖
- `npm run build` 必须通过
- 遵循 Tailwind CSS 原子化样式规范
