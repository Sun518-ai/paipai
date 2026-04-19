# TodoChat MiniMax Key 安全方案 PRD

## 1. 概述与目标

**功能名称：** TodoChat MiniMax Key 安全注入方案
**用户故事：** 作为开发者，我希望 MiniMax API Key 通过环境变量安全注入，而不是硬编码在前端代码中，以确保 Key 不会泄露到客户端。
**目标：** 建立安全的 API Key 管理机制，确保所有敏感 Key 仅在服务端使用，不会暴露给浏览器客户端。

## 2. 背景与安全性要求

### 2.1 安全风险

- **硬编码风险**：如果 API Key 直接写在代码中或客户端代码里，任何能访问源代码或浏览器 DevTools 的人都可以获取 Key
- **Git 泄露风险**：如果 Key 提交到 Git 仓库，会永久存在于历史记录中
- **客户端暴露风险**：使用 `NEXT_PUBLIC_` 前缀的变量会被 Next.js 暴露到客户端 bundle

### 2.2 合规要求

- API Key 必须存储在 `.env.local` 文件中（不提交到 Git）
- API Key 变量不能使用 `NEXT_PUBLIC_` 前缀
- AI SDK 初始化必须在服务端代码（API Routes 或 Server Components）中进行
- 客户端代码只能调用封装好的 API 接口，不能直接使用 SDK

## 3. 方案描述

### 3.1 环境变量配置

```
# .env.local（本地开发，勿提交到 Git）
MINIMAX_API_KEY=your_minimax_api_key_here
```

**关键点：**
- 变量名：`MINIMAX_API_KEY`（不带 `NEXT_PUBLIC_` 前缀）
- 文件位置：项目根目录的 `.env.local`
- Git 忽略：确保 `.env.local` 在 `.gitignore` 中

### 3.2 AI SDK 初始化方式

使用 Next.js AI SDK 的标准方式：

```typescript
// src/lib/ai.ts（服务端）
import { generateText } from 'ai';
import { minimax } from '@ai-sdk/minimax';

export async function generateChatResponse(prompt: string) {
  'use server'; // 仅在服务端执行
  
  const result = await generateText({
    model: minimax('mini-max-01'),
    prompt: prompt,
    apiKey: process.env.MINIMAX_API_KEY, // 从环境变量读取
  });
  
  return result.text;
}
```

### 3.3 客户端调用方式

客户端通过 API Route 间接调用 AI：

```typescript
// src/app/api/todochat/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();
  
  // 在服务端调用 AI SDK
  const response = await generateChatResponse(prompt);
  
  return NextResponse.json({ response });
}
```

客户端只调用 API，不直接使用 SDK 或访问 Key。

## 4. 安全边界说明

### 4.1 暴露的变量（客户端可访问）

- `NEXT_PUBLIC_*` 前缀的变量
- 客户端组件的 props 和 state
- localStorage / sessionStorage 中的数据
- API Route 的响应数据（按需）

### 4.2 不暴露的变量（仅服务端）

- `MINIMAX_API_KEY` 等非 `NEXT_PUBLIC_` 前缀的变量
- 服务端组件的内部变量
- API Route 内部逻辑和变量

### 4.3 安全矩阵

| 变量名 | 前缀 | 客户端可见 | 用途 |
|--------|------|-----------|------|
| `MINIMAX_API_KEY` | 无 | ❌ 否 | MiniMax API 认证 |
| `NEXT_PUBLIC_APP_URL` | NEXT_PUBLIC_ | ✅ 是 | 公开配置 |

## 5. 文件结构

```
paipai/
├── .env.local.example    # 环境变量模板（提交到 Git）
├── .env.local            # 本地环境变量（不提交）
├── .gitignore           # 包含 .env.local
├── src/
│   ├── app/api/todochat/
│   │   └── route.ts     # TodoChat API 端点
│   └── lib/
│       └── ai.ts        # AI SDK 封装（服务端）
└── docs/
    ├── todochat-apikey-prd.md
    └── todochat-apikey-tech-doc.md
```

## 6. 验收标准

- [ ] `.env.local.example` 模板文件已创建，包含 `MINIMAX_API_KEY` 变量说明
- [ ] `.gitignore` 包含 `.env.local`
- [ ] `MINIMAX_API_KEY` 不使用 `NEXT_PUBLIC_` 前缀
- [ ] AI SDK 在服务端代码中初始化，不在客户端组件中
- [ ] README 更新，说明本地配置方式
- [ ] `npm run build` 通过
