# TodoChat MiniMax Key 安全方案 Tech Doc

## 1. 环境变量配置

### 1.1 变量定义

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `MINIMAX_API_KEY` | 是 | MiniMax API 密钥，用于 AI 功能认证 |

### 1.2 本地开发配置

创建 `.env.local` 文件（**不提交到 Git**）：

```bash
# .env.local
MINIMAX_API_KEY=your_api_key_here
```

### 1.3 环境变量模板

创建 `.env.local.example`（**提交到 Git**，作为其他开发者的参考）：

```bash
# MiniMax API Key（从 MiniMax 开放平台获取）
# https://platform.minimaxi.com/
MINIMAX_API_KEY=your_api_key_here
```

### 1.4 Git 忽略配置

确保 `.gitignore` 包含：

```gitignore
# 本地环境变量
.env.local
```

### 1.5 生产环境配置

在 Vercel 等部署平台的环境变量设置中添加：
- Key: `MINIMAX_API_KEY`
- Value: 实际的 API Key

**注意：** 不要在代码库中硬编码 Key，不要使用 `NEXT_PUBLIC_` 前缀。

## 2. AI SDK Provider 配置

### 2.1 安装依赖

```bash
npm install ai @ai-sdk/minimax
```

### 2.2 服务端 AI 封装

创建 `src/lib/ai.ts`：

```typescript
'use server';

import { generateText } from 'ai';
import { minimax } from '@ai-sdk/minimax';

/**
 * 生成 AI 聊天响应
 * 此函数仅在服务端执行，API Key 不会暴露给客户端
 */
export async function generateChatResponse(prompt: string): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY;
  
  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY 环境变量未配置');
  }

  const { text } = await generateText({
    model: minimax('mini-max-01'),
    prompt,
    apiKey,
  });

  return text;
}
```

### 2.3 API Route 创建

创建 `src/app/api/todochat/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateChatResponse } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt 参数必填' },
        { status: 400 }
      );
    }

    const response = await generateChatResponse(prompt);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('TodoChat API Error:', error);
    return NextResponse.json(
      { error: 'AI 响应生成失败' },
      { status: 500 }
    );
  }
}
```

### 2.4 客户端调用方式

```typescript
// 在客户端组件中
async function sendMessage(prompt: string) {
  const res = await fetch('/api/todochat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  
  const data = await res.json();
  return data.response;
}
```

## 3. 安全边界

### 3.1 客户端安全的变量

这些变量**不会**暴露到客户端：

| 变量名 | 说明 |
|--------|------|
| `MINIMAX_API_KEY` | MiniMax API 密钥 |
| 其他非 `NEXT_PUBLIC_` 前缀变量 | 服务端配置 |

### 3.2 客户端可见的变量

这些变量**会**暴露到客户端：

| 变量名 | 说明 |
|--------|------|
| `NEXT_PUBLIC_*` | 任何带此前缀的变量 |
| API Route 响应数据 | 客户端调用 API 返回的内容 |

### 3.3 安全检查清单

- [ ] `MINIMAX_API_KEY` 不以 `NEXT_PUBLIC_` 开头
- [ ] `.env.local` 不提交到 Git
- [ ] AI SDK 不在客户端组件中初始化
- [ ] API Key 不出现在客户端代码或 bundle 中
- [ ] API Route 正确处理错误，不泄露敏感信息

## 4. 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `.env.local.example` | 新增 | 环境变量模板 |
| `.gitignore` | 检查 | 确保包含 `.env.local` |
| `src/lib/ai.ts` | 新增 | AI SDK 服务端封装 |
| `src/app/api/todochat/route.ts` | 新增 | TodoChat API 端点 |
| `README.md` | 更新 | 添加环境配置说明 |
| `docs/todochat-apikey-prd.md` | 新增 | PRD 文档 |
| `docs/todochat-apikey-tech-doc.md` | 新增 | Tech Doc |

## 5. 常见问题

### Q: 为什么不能使用 `NEXT_PUBLIC_MINIMAX_API_KEY`？
A: `NEXT_PUBLIC_` 前缀的变量会被 Next.js 打包到客户端 JavaScript bundle 中，任何人可以在浏览器中查看。

### Q: 如何验证 Key 是否泄露？
A: 
1. 运行 `npm run build`
2. 检查 `.next/static` 目录下的 JS 文件，确保不包含 API Key
3. 或在浏览器 DevTools 中搜索 API Key 字符串

### Q: 生产环境如何配置？
A: 在 Vercel/Railway 等平台的 Dashboard 中设置环境变量 `MINIMAX_API_KEY`，不要在代码库中配置。
