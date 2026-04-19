# TodoChat 流式输出技术文档

## 1. 概述

本文档描述 TodoChat 流式输出功能的实现细节。

## 2. 技术方案

### 2.1 依赖

- `ai` - Vercel AI SDK 核心包，提供 `streamText`
- `@ai-sdk/react` - React 集成，提供 `useChat` hook
- `vercel-minimax-ai-provider` - MiniMax provider

### 2.2 文件结构

```
src/
├── app/
│   └── api/
│       └── chat/
│           └── route.ts      # 流式 API 端点（修改）
├── components/
│   └── TodoChat.tsx          # Chat UI 组件（修改）
└── lib/
    ├── aiProvider.ts         # AI Provider（已有）
    └── todoTools.ts          # 工具定义（已有）
```

## 3. API 层实现

### 3.1 修改 `src/app/api/chat/route.ts`

**关键变更：**
1. 使用 `streamText` 替代普通 fetch 调用
2. 返回 `Response` 对象，使用 `toDataStreamResponse()` 方法

```typescript
import { streamText } from 'ai';
import { getModel } from '@/lib/aiProvider';
import { TOOLS } from '@/lib/todoTools';

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const result = await streamText({
    model: getModel(),
    system: '你是一个友好的待办事项助手，帮助用户管理任务。',
    messages,
    tools: TOOLS,
  });

  return result.toDataStreamResponse();
}
```

### 3.2 `streamText` 配置选项

| 选项 | 说明 |
|------|------|
| `model` | MiniMax 模型实例 |
| `messages` | 对话消息历史 |
| `tools` | 可用工具列表 |
| `system` | 系统提示词 |

### 3.3 工具执行

`streamText` 会自动处理工具调用循环：
1. 模型决定是否调用工具
2. 自动执行工具并返回结果
3. 将结果注入消息历史
4. 继续生成响应

## 4. 前端实现

### 4.1 修改 `src/components/TodoChat.tsx`

**关键变更：**
1. 使用 `useChat` hook 替代手动的 state 管理
2. 配置 `streaming: true`（默认）
3. 使用 `handleSubmit` 处理表单提交

```typescript
'use client';

import { useChat } from '@ai-sdk/react';

export default function TodoChat() {
  const { messages, input, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <form onSubmit={handleSubmit}>
      {/* 消息列表 */}
      <div>
        {messages.map((m) => (
          <div key={m.id}>{m.content}</div>
        ))}
      </div>
      
      {/* 输入框 */}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="说点什么..."
      />
      
      {/* 加载状态 */}
      {isLoading && <div>正在输入...</div>}
    </form>
  );
}
```

### 4.2 `useChat` 钩子选项

| 选项 | 说明 |
|------|------|
| `api` | API 端点路径 |
| `id` | 聊天会话 ID（用于多会话） |
| `initialMessages` | 初始消息列表 |
| `onFinish` | 流式结束时回调 |
| `onError` | 错误回调 |

### 4.3 `useChat` 返回值

| 属性 | 说明 |
|------|------|
| `messages` | 消息列表 |
| `input` | 当前输入 |
| `setInput` | 设置输入 |
| `handleSubmit` | 提交处理函数 |
| `isLoading` | 是否正在生成 |
| `stop` | 停止生成函数 |

## 5. SSE 事件流

### 5.1 数据格式

Vercel AI SDK 的 `toDataStreamResponse()` 生成符合 [AI SDK 协议](https://sdk.vercel.ai/docs/ai-sdk-protocol) 的 SSE 流：

```
data: {"id":"msg_xxx","role":"assistant","content":"Hello"}
data: {"id":"msg_xxx","role":"assistant","content":" World"}
data: [DONE]
```

### 5.2 事件类型

| 事件 | 说明 |
|------|------|
| `text` | 文本块更新 |
| `tool_call` | 工具调用 |
| `tool_result` | 工具执行结果 |
| `finish` | 生成结束 |

## 6. 组件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/api/chat/route.ts` | 修改 | 使用 `streamText` 流式响应 |
| `src/components/TodoChat.tsx` | 修改 | 使用 `useChat` hook |
| `docs/todochat-streaming-prd.md` | 新增 | PRD 文档 |
| `docs/todochat-streaming-tech-doc.md` | 新增 | Tech Doc 文档 |

## 7. 实现步骤

1. **API 层改造**
   - 导入 `streamText` from `ai`
   - 使用 `streamText` 包装模型调用
   - 返回 `toDataStreamResponse()`

2. **前端层改造**
   - 导入 `useChat` from `@ai-sdk/react`
   - 替换手动的 state 为 `useChat`
   - 调整 UI 以适配新的消息格式

3. **测试验证**
   - 本地测试流式响应
   - 验证工具调用正常工作
   - 检查 build 是否通过

## 8. 注意事项

1. **工具调用**：MiniMax 模型可能不支持流式工具调用，需要确保工具结果正确注入
2. **错误处理**：`useChat` 提供 `onError` 回调用于错误处理
3. **中断功能**：使用 `stop()` 函数可以中断正在进行的生成
4. **消息 ID**：`useChat` 自动生成消息 ID，无需手动管理
