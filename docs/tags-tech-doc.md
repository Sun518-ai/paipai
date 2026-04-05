# 标签分类功能 Tech Doc

## 1. 技术方案

### 1.1 数据模型

```typescript
// 标签
interface Tag {
  id: string;
  name: string;
  color: string; // hex e.g. "#3b82f6"
}

// 扩展 Todo
interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  pinned: boolean;
  tagIds: string[]; // 新增：关联标签 ID 数组
}
```

### 1.2 Storage Keys

| Key | 内容 | 说明 |
|-----|------|------|
| `paipai-tags` | `Tag[]` | 所有标签 |
| `paipai-todos` | `Todo[]` | 所有任务（扩展 tagIds） |

### 1.3 组件结构

在 `page.tsx` 中扩展，不新增文件：

1. **TagBadge 组件**：显示单个标签徽章
2. **TagPicker 组件**：多选标签浮层
3. **TagFilterBar**：标签筛选栏
4. **TagManageModal**：标签管理弹窗

### 1.4 状态管理

在现有 `TodoMCVPage` 中添加：
- `tags: Tag[]` 状态
- `selectedFilterTagId: string | null` 筛选状态
- `showTagPicker: { todoId: string } | null` 标签选择弹窗
- `showTagManage: boolean` 管理弹窗

### 1.5 默认标签

```typescript
const DEFAULT_TAGS: Tag[] = [
  { id: 'tag-work', name: '工作', color: '#3b82f6' },
  { id: 'tag-urgent', name: '紧急', color: '#ef4444' },
  { id: 'tag-study', name: '学习', color: '#22c55e' },
];
```

### 1.6 国际化

翻译新增字段：
```typescript
zh: {
  // ... existing
  manageTags: '管理标签',
  addTag: '添加标签',
  editTag: '编辑标签',
  deleteTag: '删除标签',
  tagName: '标签名',
  tagColor: '颜色',
  noTags: '暂无标签',
  filterByTag: '按标签筛选',
}
```

### 1.7 实现要点

1. **防重**：加载时合并默认标签，避免重复创建
2. **删除标签**：从所有任务的 `tagIds` 中移除被删除的标签 ID
3. **筛选逻辑**：`filtered` 在现有 filter 基础上增加 tag 筛选条件
4. **颜色选择器**：使用 `<input type="color">` 原生组件
5. **Hydration 安全**：所有 tag 状态在 `useEffect` 中加载

## 2. 文件变更

- `src/app/ideas/todomcv/page.tsx` — 扩展现有组件，添加标签功能
- `docs/tags-prd.md` — 新增
- `docs/tags-tech-doc.md` — 新增
