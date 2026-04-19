# TodoChat 到期提醒推送功能 Tech Doc

## 1. 修改文件清单

- `src/components/TodoChat.tsx` — 主组件，集成到期状态和通知逻辑
- `src/lib/localStore.ts` — 新增配置存储 key

## 2. 数据模型变更

### 2.1 Todo 接口扩展

```typescript
interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  pinned: boolean;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  dueDate: number | null; // 新增
}
```

### 2.2 提醒配置

```typescript
interface ReminderConfig {
  enabled: boolean;        // 是否启用通知
  advanceNotice: '1h' | '1d'; // 提前提醒时间
}

const REMINDER_CONFIG_KEY = 'paipai-todo-reminder-config';

const DEFAULT_CONFIG: ReminderConfig = {
  enabled: true,
  advanceNotice: '1h',
};
```

### 2.3 新增类型

```typescript
type DueStatus = 'normal' | 'dueSoon' | 'overdue';
```

## 3. 核心逻辑

### 3.1 获取任务到期状态

```typescript
function getDueStatus(dueDate: number | null, done: boolean): DueStatus {
  if (done || dueDate === null) return 'normal';
  const now = Date.now();
  const diff = dueDate - now;
  if (diff < 0) return 'overdue';
  const threshold = advanceNotice === '1d' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  if (diff <= threshold) return 'dueSoon';
  return 'normal';
}
```

### 3.2 格式化剩余时间

```typescript
function formatRemainingTime(dueDate: number): string {
  const diff = dueDate - Date.now();
  if (diff < 0) return '已过期';
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} 天后到期`;
  if (hours > 0) return `${hours} 小时后到期`;
  const minutes = Math.floor(diff / (60 * 1000));
  return `${minutes} 分钟后到期`;
}
```

### 3.3 通知发送

```typescript
function requestNotificationPermission(): Promise<NotificationPermission> {
  if (Notification.permission === 'default') {
    return Notification.requestPermission();
  }
  return Promise.resolve(Notification.permission);
}

function sendDueNotification(todo: Todo, remainingTime: string): void {
  if (Notification.permission !== 'granted') return;
  const notification = new Notification('📅 任务即将到期', {
    body: `${todo.text}\n剩余时间: ${remainingTime}`,
    icon: '/favicon.ico',
    tag: `due-${todo.id}`, // 防止重复通知
  });
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
```

### 3.4 定时检测逻辑

```typescript
useEffect(() => {
  // 加载配置
  const config = loadHybrid<ReminderConfig>(REMINDER_CONFIG_KEY, DEFAULT_CONFIG);
  
  // 加载任务
  const todos = loadHybrid<Todo[]>('paipai-todos', []);
  
  const checkDueTasks = () => {
    if (!config.enabled) return;
    todos.forEach(todo => {
      if (todo.done || !todo.dueDate) return;
      const status = getDueStatus(todo.dueDate, todo.done);
      if (status === 'overdue' || status === 'dueSoon') {
        sendDueNotification(todo, formatRemainingTime(todo.dueDate));
      }
    });
  };
  
  const interval = setInterval(checkDueTasks, 60 * 1000); // 每分钟检测
  return () => clearInterval(interval);
}, []);
```

## 4. UI 变更

### 4.1 状态徽章

| 状态 | 徽章 | 样式 |
|------|------|------|
| 临近到期 | 🟠 | `bg-amber-100 text-amber-700` |
| 已过期 | 🔴 | `bg-red-100 text-red-700` |

### 4.2 消息卡片扩展

在 TodoChat 的 assistant 消息中，如果内容包含任务列表，附加显示到期状态。

## 5. 构建

- `npm run build` 通过
- TypeScript 严格模式
- 无新增依赖
