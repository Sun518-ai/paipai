# TodoChat 流式输出（打字机效果）PRD

## 1. 背景与目标

### 1.1 项目概述
「派派点子站」是一个为派派（孙识宇小朋友）打造的创意工具集合，TodoMVC 模块提供待办事项管理功能。

### 1.2 为什么需要流式输出

当前 TodoChat 功能使用普通 HTTP 请求实现 AI 对话，存在以下问题：
- **用户体验不佳**：用户需要等待整个响应生成完毕后才能看到结果
- **感知延迟明显**：对于较长的 AI 响应，用户会感到明显的等待
- **交互性差**：无法及时中断已发送的无效请求

通过 SSE（Server-Sent Events）实现流式返回，可以：
- **即时反馈**：AI 生成的内容立即显示，用户感知到"正在打字"效果
- **更好的交互性**：支持用户随时中断生成过程
- **提升用户体验**：类似打字机的效果，更自然流畅

## 2. 功能需求

### 2.1 核心功能

#### 2.1.1 TodoChat AI 对话
- 用户可以通过自然语言与 AI 助手对话
- AI 可以帮助用户：
  - 添加、修改、删除待办事项
  - 管理任务优先级
  - 查询当前待办列表
  - 提供任务规划建议

#### 2.1.2 SSE 流式输出
- AI 响应通过 SSE 流式返回，逐字显示
- 前端实时渲染 AI 的流式响应
- 支持流式中断（用户可以取消正在生成的响应）

### 2.2 用户交互

| 功能 | 描述 |
|------|------|
| 发送消息 | 支持 Enter 发送和按钮发送 |
| 加载状态 | 显示 AI 正在思考/输入的动画效果 |
| 流式显示 | AI 响应以打字机效果逐字显示 |
| 中断生成 | 用户可以中断正在生成的响应 |

### 2.3 非功能需求

#### 2.3.1 性能
- 首次响应时间 < 500ms
- 流式输出延迟 < 100ms/字

#### 2.3.2 稳定性
- 网络异常时自动处理
- 请求超时设置合理

## 3. 技术方案

### 3.1 技术栈
- **前端框架**：Next.js (App Router)
- **AI SDK**：Vercel AI SDK (`ai` 包)
- **AI Provider**：vercel-minimax-ai-provider
- **数据持久化**：飞书 Bitable
- **样式**：Tailwind CSS

### 3.2 组件变更
- `src/components/TodoChat.tsx` - 使用 `useChat` hook 实现流式 UI
- `src/app/api/chat/route.ts` - 使用 `streamText` 实现 SSE 流式响应

## 4. 验收标准

### 4.1 功能验收

| 验收项 | 标准 | 测试方法 |
|--------|------|----------|
| 流式返回正常 | AI 响应以流式方式逐字显示 | 发送问题，观察响应是否为流式 |
| 打字机效果 | 文字逐字出现，有打字机视觉反馈 | 观察 AI 响应时的文字显示方式 |
| UI 反馈 | 显示"正在输入..."状态 | 观察 AI 响应时的 UI 状态 |
| 错误处理 | 网络异常时显示友好错误提示 | 断网测试 |

### 4.2 技术验收

- [ ] `npm run build` 通过
- [ ] TypeScript 类型检查通过
- [ ] ESLint 检查通过
- [ ] 流式响应符合 SSE 规范
- [ ] 支持通过 Vercel AI SDK 中断请求

## 5. 实现细节

### 5.1 API 层
使用 Vercel AI SDK 的 `streamText` 函数，配合 MiniMax provider 实现流式响应：

```typescript
const result = await streamText({
  model: getModel(),
  messages,
  tools: TOOLS,
});

return result.toDataStreamResponse();
```

### 5.2 前端层
使用 `@ai-sdk/react` 的 `useChat` hook：

```typescript
const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
});
```

`useChat` 自动处理：
- SSE 连接管理
- 流式数据解析
- 消息状态管理
- 自动滚动

## 6. 风险与对策

| 风险 | 对策 |
|------|------|
| MiniMax API 不支持流式 | 降级为普通请求模式 |
| 网络中断导致流式中断 | 前端显示错误状态，支持重试 |
| 长响应导致 UI 卡顿 | 使用 `react-markdown` 分批渲染 |
