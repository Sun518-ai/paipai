# TodoChat SSE 流式返回技术文档

## 1. 技术方案

### 1.1 核心技术选型

采用 **Vercel AI SDK** 实现流式 AI 对话，主要理由：

1. **开箱即用的流式支持**：SDK 内置 `streamText` 和 `streamUI` 方法，自动处理 SSE
2. **Provider 集成完善**：支持 vercel-minimax-ai-provider，该 provider 已内置 stream 支持
3. **React Hooks 支持**：提供 `useChat` hook，简化流式聊天状态管理
4. **生产级稳定性**：Vercel AI SDK 是业界标准的 AI 应用开发框架

### 1.2 架构设计

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   TodoChat UI   │ ──── │   API Route     │ ──── │   MiniMax AI    │
│  (useChat)      │ HTTP │  /api/chat      │ API  │  (流式响应)      │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │
        │  SSE Stream            │
        └────────────────────────┘
```

## 2. API 设计

### 2.1 接口定义

**端点**：`POST /api/chat`

**请求体**：
```typescript
interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}
```

**响应**：SSE 流式响应

**SSE 事件格式**：
```
event: text.delta
data: {"delta": "你好"}

event: text.delta
data: {"delta": "，今天有什么"}

event: done
data: {}
```

### 2.2 API Route 实现

使用 Vercel AI SDK 的 `streamText` 方法：

```typescript
import { vercelAIMinimax } from 'vercel-minimax-ai-provider';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = await streamText({
    model: vercelAIMinimax('*'),
    messages,
    system: '你是派派点子站的 AI 助手...',
  });
  
  return result.toDataStreamResponse();
}
```

## 3. 前端实现

### 3.1 使用 useChat Hook

Vercel AI SDK 提供 `useChat` hook，管理聊天状态：

```typescript
import { useChat } from 'ai/react';

const { messages, input, handleInputChange, handleSubmit, isLoading, stop } = useChat({
  api: '/api/chat',
});
```

### 3.2 核心功能

| 功能 | 实现 |
|------|------|
| 发送消息 | `handleSubmit` |
| 实时显示 | `messages` 状态自动更新 |
| 加载状态 | `isLoading` 标识 |
| 中断生成 | `stop()` 方法 |
| 输入绑定 | `input` + `handleInputChange` |

## 4. 数据流

### 4.1 消息流程

```
用户输入 ──► 表单提交 ──► useChat 状态更新 ──► API 请求
                              │
                              ▼
                        messages 添加用户消息
                              │
                              ▼
                        API 返回 SSE 流
                              │
                              ▼
                        useChat 自动解析流
                              │
                              ▼
                        messages 添加 AI 消息（增量）
                              │
                              ▼
                        UI 组件响应式更新
```

### 4.2 SSE 事件类型

| 事件 | 数据格式 | 说明 |
|------|----------|------|
| `text.delta` | `{ delta: string }` | 增量文本 |
| `done` | `{}` | 流结束 |
| `error` | `{ error: string }` | 错误信息 |

## 5. 文件变更列表

### 5.1 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/app/api/chat/route.ts` | AI Chat API 端点 |
| `src/components/TodoChat.tsx` | TodoChat UI 组件 |
| `docs/chat-sse-prd.md` | PRD 文档 |
| `docs/chat-sse-tech-doc.md` | 技术文档 |

### 5.2 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `src/app/ideas/todomcv/page.tsx` | 集成 TodoChat 组件 |
| `package.json` | 添加 AI SDK 依赖 |
| `tsconfig.json` | 可能需要添加路径别名 |

### 5.3 依赖安装

```bash
npm install ai @ai-sdk/react vercel-minimax-ai-provider
```

## 6. 状态管理

### 6.1 useChat 内置状态

```typescript
interface ChatState {
  messages: Message[];
  input: string;
  isLoading: boolean;
  error: Error | null;
}
```

### 6.2 Todo 上下文集成

TodoChat 需要访问 TodoMVC 的待办列表，通过 React Context 共享状态：

```typescript
<TodoContext.Provider value={{ todos, addTodo, ... }}>
  <TodoChat />
</TodoContext.Provider>
```

## 7. 错误处理

| 错误场景 | 处理方式 |
|----------|----------|
| 网络断开 | 显示重连按钮 |
| API 超时 | 显示超时提示，允许重试 |
| AI 服务错误 | 显示错误消息，保留用户输入 |
| 流式中断 | 优雅停止，显示已生成的内容 |

## 8. 安全考虑

- API Route 添加身份验证（后续迭代）
- 输入内容长度限制
- 防止 prompt 注入攻击
