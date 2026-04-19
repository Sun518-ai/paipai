# TodoChat 多轮对话上下文技术文档

## 1. 技术方案

### 1.1 核心技术选型

采用 **Vercel AI SDK** 的 `useChat` hook 实现多轮对话，主要理由：

1. **内置状态管理**：`useChat` 自动管理 `messages`、`input`、`isLoading` 等状态
2. **流式支持完善**：内置 SSE 流式解析，用户无需手动处理
3. **上下文自动传递**：messages 数组自动随每次请求发送给 API
4. **React 生态成熟**：与 Next.js App Router 无缝集成

### 1.2 架构设计

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  TodoChat UI    │ ──── │   API Route     │ ──── │   MiniMax AI    │
│  (useChat)      │ HTTP │  /api/chat      │ API  │  (流式响应)      │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │
        │  SSE Stream            │
        └────────────────────────┘
```

## 2. API 设计

### 2.1 现有接口复用

**端点**：`POST /api/chat`（已存在）

**请求体**：
```typescript
interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}
```

**响应**：SSE 流式响应（`result.toUIMessageStreamResponse()`）

### 2.2 useChat 配置

```typescript
const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat({
  api: '/api/chat',
});
```

## 3. 消息数据结构

### 3.1 useChat 内置消息格式

```typescript
interface Message {
  id: string;         // 自动生成的唯一 ID
  role: 'user' | 'assistant' | 'system';
  content: string;    // 消息文本内容
  createdAt?: Date;   // 创建时间（可选）
}
```

### 3.2 消息流向

```
用户输入 → handleSubmit → messages 添加用户消息
                                    ↓
                              API 请求发送
                                    ↓
                              SSE 流返回
                                    ↓
                         messages 添加 AI 消息（增量）
                                    ↓
                         UI 组件响应式更新
```

## 4. UI 组件设计

### 4.1 布局结构

```
┌─────────────────────────────────────┐
│           Header (返回 + 标题)       │
├─────────────────────────────────────┤
│                                     │
│         消息列表区域                 │
│   ┌──────────────────────┐          │
│   │ AI 消息 (左对齐气泡)   │          │
│   └──────────────────────┘          │
│                 ┌──────────────────────┐  │
│                 │ 用户消息 (右对齐气泡) │  │
│                 └──────────────────────┘  │
│   ┌──────────────────────┐          │
│   │ AI 消息 (左对齐气泡)   │          │
│   └──────────────────────┘          │
│                                     │
├─────────────────────────────────────┤
│  输入框 (底部固定) + 发送按钮        │
└─────────────────────────────────────┘
```

### 4.2 样式规范

| 元素 | 样式 |
|------|------|
| 用户气泡 | 右对齐，紫色/indigo 背景，白色文字 |
| AI 气泡 | 左对齐，灰色背景，深色文字 |
| 输入框 | 底部固定，圆角，聚焦时边框高亮 |
| 发送按钮 | 圆形，accent 色，图标按钮 |

### 4.3 Dark Mode

- 用户气泡：`dark:bg-indigo-600` / `dark:bg-indigo-500`
- AI 气泡：`dark:bg-slate-700` / `dark:bg-slate-600`
- 背景：复用全局 CSS 变量

## 5. i18n 中英文支持

### 5.1 文本定义

```typescript
const i18n = {
  zh: {
    title: '💬 TodoChat',
    placeholder: '输入消息...',
    send: '发送',
    thinking: '正在思考...',
    emptyHint: '发送消息开始对话 ✨',
    back: '← 返回点子站',
  },
  en: {
    title: '💬 TodoChat',
    placeholder: 'Type a message...',
    send: 'Send',
    thinking: 'Thinking...',
    emptyHint: 'Send a message to start ✨',
    back: '← Back to Ideas',
  },
};
```

### 5.2 语言检测

使用 `navigator.language` 或 `Accept-Language` header 检测，默认中文。

## 6. 文件结构

```
src/app/ideas/chat/
└── page.tsx        # TodoChat 多轮对话页面
```

**注意**：无需新建组件文件，所有逻辑内聚在 page.tsx 中（与 dashboard/page.tsx 保持一致）。

## 7. 实现要点

### 7.1 useChat 核心属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `messages` | `Message[]` | 消息列表，包含用户和 AI 消息 |
| `input` | `string` | 当前输入框内容 |
| `handleInputChange` | `function` | 绑定 input onChange |
| `handleSubmit` | `function` | 绑定表单提交 |
| `isLoading` | `boolean` | AI 是否正在响应 |
| `stop` | `function` | 中断正在生成的响应 |

### 7.2 滚动行为

- 消息列表使用 `ref` + `useEffect` 自动滚动到底部
- `scrollIntoView({ behavior: 'smooth' })`

### 7.3 性能优化

- 消息列表使用 `overflow-y-auto` 虚拟滚动（如消息量过大）
- 输入框防抖（非必要，useChat 已内置）

## 8. 错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| 网络断开 | useChat 内置错误状态，显示错误消息 |
| API 超时 | 显示友好提示，允许用户重试 |
| 流式中断 | 优雅停止，显示已生成的内容 |

## 9. 依赖

无新增依赖，复用现有 `ai` 和 `@ai-sdk/react` 包。

```bash
# 已有
npm install ai @ai-sdk/react vercel-minimax-ai-provider
```
