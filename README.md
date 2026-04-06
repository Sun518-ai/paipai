# 派派点子站 Paipai Ideas

一个有趣的互动创意展示平台，包含派派工程车救援站、TodoMVC、贪食蛇等多个创意功能。

## 本地开发配置

### 1. 环境变量设置

复制环境变量模板文件：

```bash
cp .env.local.example .env.local
```

然后编辑 `.env.local`，填入必要的配置：

```bash
# MiniMax API Key（从 MiniMax 开放平台获取）
# https://platform.minimaxi.com/
MINIMAX_API_KEY=your_api_key_here
```

**安全说明：**
- `.env.local` 文件不会提交到 Git（已在 `.gitignore` 中忽略）
- `MINIMAX_API_KEY` 不使用 `NEXT_PUBLIC_` 前缀，确保不会暴露到客户端
- API Key 仅在服务端 API Route 中使用，不会在浏览器中泄露

### 2. 启动开发服务器

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geert](https://vercel.com/font) for Vercel.

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **AI**: MiniMax API

## 功能列表

- 🚜 **派派工程车救援站** - 互动救车游戏
- ✅ **TodoMVC** - 待办事项管理
- 🐍 **贪食蛇** - 经典童年游戏
- 🐛 **派派昆虫百科** - 宝可梦风格集卡
- 📷 **美好时光相册** - 照片轮播展示
- ⏰ **派派倒计时** - 重要日子倒计时
- 🍅 **番茄钟** - 专注时间管理
- 🏷️ **标签分类** - 多标签任务管理
- 🔄 **重复任务** - 周期性任务
- 📅 **截止日期** - 任务截止日期管理
- 🔴 **优先级** - P0-P3 优先级设置
- 💬 **TodoChat** - AI 智能待办助手

## 了解更多

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [MiniMax Platform](https://platform.minimaxi.com/) - 获取 AI API Key

## 部署

推荐使用 [Vercel Platform](https://vercel.com/new) 部署，平台会自动配置环境变量。

## 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `MINIMAX_API_KEY` | 是 | MiniMax API 密钥，用于 AI 对话功能 |
