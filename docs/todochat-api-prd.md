# TodoChat API PRD - 派派点子站 AI 对话功能

## 1. 概述

**项目名称:** 派派工程车俱乐部 TodoChat  
**类型:** AI 对话 API 重构  
**目标:** 将现有 AI 逻辑迁移到 Vercel AI SDK (streamText + generateText)  
**用户:** 派派和爸爸 👨‍👦

## 2. 功能需求

### 2.1 核心功能
- **流式文本生成**: 使用 `streamText` 实现实时 AI 回复流
- **多轮对话**: 支持上下文记忆，传递完整 messages 数组
- **generateText 降级**: 非流式场景使用 `generateText`

### 2.2 API 端点
| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/chat` | POST | AI 对话（流式） |

### 2.3 请求格式
```json
{
  "messages": [
    { "role": "user", "content": "派派想要听工程车的故事" }
  ]
}
```

### 2.4 响应格式
- Content-Type: `text/plain; charset=utf-8`
- 流式输出，逐字返回

## 3. 技术选型

- **框架**: Next.js 14+ (App Router)
- **AI SDK**: Vercel AI SDK (`ai` package)
- **模型**: MiniMax (通过 OpenAI-compatible API)
- **环境变量**: `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`

## 4. 完成标准

- ✅ API 路由实现 streamText
- ✅ npm run build 通过
- ✅ 多轮对话上下文正确传递
- ✅ MR 创建并合并
