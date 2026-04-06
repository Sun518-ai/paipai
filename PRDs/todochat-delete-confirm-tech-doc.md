# Tech Doc: TodoChat 删除确认对话框

## 1. 技术方案

使用 React `useState` + 自定义确认对话框组件，不依赖第三方 Modal 库，保持项目轻量。

### 方案选择

- **不采用** `window.confirm()`：样式不可控，与 dark mode 不兼容
- **采用** 自定义确认对话框组件：样式可控，与项目风格一致

## 2. 组件设计

### DeleteConfirmDialog 组件

```tsx
interface DeleteConfirmDialogProps {
  todoText: string;       // 待删除任务文本
  onConfirm: () => void;  // 确认回调
  onCancel: () => void;   // 取消回调
}
```

**UI 规范**：

- 居中模态框，半透明黑色背景（`bg-black/40`）
- 白色/深色卡片，圆角 `rounded-2xl`
- 标题：红色强调
- 确认按钮：`bg-red-500 hover:bg-red-600 text-white`
- 取消按钮：`bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200`

## 3. 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/app/ideas/todomcv/page.tsx` | 修改 | 添加 `DeleteConfirmDialog` 组件和 `deleteConfirm` state |
| `src/components/TodoChat.tsx` | 无变更 | 删除逻辑不在此组件 |

## 4. 实现细节

### State

```tsx
const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; text: string } | null>(null);
```

### Handler

```tsx
const confirmDelete = (id: string, text: string) => {
  setDeleteConfirm({ id, text });
};

const handleDeleteConfirm = () => {
  if (deleteConfirm) {
    setTodos((prev) => prev.filter((t) => t.id !== deleteConfirm.id));
    setDeleteConfirm(null);
  }
};
```

### 删除按钮变更

```tsx
// Before
onClick={() => deleteTodo(todo.id)}

// After
onClick={() => confirmDelete(todo.id, todo.text)}
```

## 5. 样式参考

参考项目已有的 dark mode toggle 按钮风格：

- 圆角：`rounded-xl` / `rounded-2xl`
- 背景：`bg-white dark:bg-slate-800`
- 边框：`border border-gray-200 dark:border-slate-600`
- 阴影：`shadow-lg`
- 动画：`transition-colors`
