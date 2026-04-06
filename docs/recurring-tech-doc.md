# Tech Doc - 重复任务功能实现

## 1. 数据模型

### 1.1 类型定义

```typescript
type RecurringType = 'none' | 'daily' | 'weekly' | 'monthly';

interface RecurringRule {
  type: RecurringType;
  dayOfWeek?: number;   // 0=周日, 1=周一, ..., 6=周六 (weekly)
  dayOfMonth?: number;  // 1-31 (monthly)
  lastGeneratedAt: number; // timestamp of last generation
  seriesCreatedAt: number; // original creation time
}

interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  pinned: boolean;
  dueDate: number | null;  // pre-existing
  recurring?: RecurringRule;  // NEW
  completedAt?: number;  // NEW
}
```

## 2. 核心逻辑

### 2.1 创建带重复规则的任务

在 `addTodo` 函数中：
```typescript
if (recurringType !== 'none') {
  newTodo.recurring = {
    type: recurringType,
    dayOfWeek: recurringType === 'weekly' ? dayOfWeek : undefined,
    dayOfMonth: recurringType === 'monthly' ? dayOfMonth : undefined,
    lastGeneratedAt: now,
    seriesCreatedAt: now,
  };
}
```

### 2.2 完成时生成下一个任务

在 `toggleTodo` 函数中：
```typescript
if (!task.done && task.recurring && task.recurring.type !== 'none') {
  const now = Date.now();
  const newTask: Todo = {
    id: genId(),
    text: task.text,
    done: false,
    pinned: false,
    createdAt: now,
    dueDate: null,
    completedAt: undefined,
    recurring: {
      ...task.recurring,
      lastGeneratedAt: now,
      seriesCreatedAt: task.recurring.seriesCreatedAt,
    },
  };
  return [
    ...prev.map(t => t.id === id ? { ...t, done: true, completedAt: now } : t),
    newTask,
  ];
}
```

## 3. 组件结构

### 3.1 新增组件

| 组件 | 用途 |
|------|------|
| `RecurringSelector` | 下拉选择重复类型，支持 weekly/monthly 子选项 |
| `RecurringBadge` | 显示 🔁 图标 + hover tooltip |

### 3.2 RecurringSelector Props
```typescript
interface RecurringSelectorProps {
  value: RecurringType;
  dayOfWeek: number;
  dayOfMonth: number;
  onChange: (type: RecurringType, dayOfWeek: number, dayOfMonth: number) => void;
}
```

### 3.3 RecurringBadge Props
```typescript
interface RecurringBadgeProps {
  rule: RecurringRule;
}
```

## 4. 国际化

所有重复相关文本都添加到 `translations.zh` 和 `translations.en`：

```typescript
recurring: '重复' / 'Repeat',
recurringNone: '不重复' / 'No repeat',
recurringDaily: '每日' / 'Daily',
recurringWeekly: '每周' / 'Weekly',
recurringMonthly: '每月' / 'Monthly',
recurringOn: '每' / 'Every ',
selectDayOfWeek: '选择星期' / 'Select day',
selectDayOfMonth: '选择日期' / 'Select date',
sun: '周日' / 'Sun',
mon: '周一' / 'Mon',
// ... tue through sat
day: '日' / '',
```

## 5. 存储

localStorage key: `paipai-todos` (unchanged, recurring data embedded in Todo objects)

```json
[
  {
    "id": "xxx",
    "text": "喝水",
    "done": false,
    "createdAt": 1712000000000,
    "pinned": false,
    "dueDate": null,
    "recurring": {
      "type": "daily",
      "lastGeneratedAt": 1712000000000,
      "seriesCreatedAt": 1712000000000
    }
  }
]
```

## 6. 文件变更

| 文件 | 变更 |
|------|------|
| `src/app/ideas/todomcv/page.tsx` | 添加 RecurringSelector, RecurringBadge 组件；扩展 Todo 接口；更新 addTodo/toggleTodo 逻辑 |

## 7. 测试用例

- [x] 创建每日重复任务 → 完成 → 确认新任务生成
- [x] 创建每周重复任务 → 选择星期 → 完成 → 确认新任务生成
- [x] 创建每月重复任务 → 选择日期 → 完成 → 确认新任务生成
- [x] 切换语言 → 重复规则文本正确显示
- [x] npm run build → 成功
