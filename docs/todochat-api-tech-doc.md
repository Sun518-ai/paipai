# TodoChat API Tech Doc - 技术文档

## 1. 项目结构

```
paipai-vehicles/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # AI 对话 API
│   └── layout.tsx
│   └── page.tsx
├── docs/
│   ├── todochat-api-prd.md
│   └── todochat-api-tech-doc.md
├── public/
├── package.json
└── .env.local
```

## 2. AI SDK 集成

### 2.1 安装依赖
```bash
npm install ai @ai-sdk/openai
```

### 2.2 API Route 实现 (app/api/chat/route.ts)

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('MiniMax'),
    system: '你是派派的好朋友，专门讲工程车的故事。',
    messages,
  });

  return result.toDataStreamResponse();
}
```

## 3. 环境变量

```env
MINIMAX_API_KEY=your_api_key
MINIMAX_BASE_URL=https://api.minimax.chat/v1
```

## 4. 多轮对话实现

- 前端传递完整 messages 数组（含历史）
- 后端直接透传给 AI SDK
- SDK 处理上下文窗口

## 5. 构建验证

```bash
npm run build
```

预期：无错误
