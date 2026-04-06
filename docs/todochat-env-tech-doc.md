# Tech Doc: TodoChat MiniMax API Key 环境变量配置

## 概述
本文档描述如何在 `paipai-vehicles` 项目中配置 MiniMax API Key 环境变量，为后续 AI SDK 集成做准备。

---

## 实施步骤

### Step 1: 创建 `.gitignore`
```gitignore
# Environment variables (local secrets)
.env.local
.env.local.*
```

### Step 2: 创建 `.env.local.example`
```env
# MiniMax API Key (for AI SDK)
# Get your key from: https://platform.minimaxi.com/
MINIMAX_API_KEY=your_key_here
```

### Step 3: Git 操作
```bash
git checkout -b feature/todochat-env
git add .gitignore .env.local.example docs/
git commit -m "feat: 配置 MiniMax API Key 环境变量"
git push -u origin feature/todochat-env
```

---

## 安全说明

| 变量名 | 前缀 | 暴露前端？ | 说明 |
|--------|------|-----------|------|
| `MINIMAX_API_KEY` | 无 | ❌ 否 | 仅服务端使用，Node.js 环境可访问 |
| `NEXT_PUBLIC_*` | NEXT_PUBLIC_ | ⚠️ 风险 | 禁止使用，会暴露在客户端 bundle |

---

## FAQ

**Q: 为什么不用 `.env` 而用 `.env.local`？**
A: Next.js 约定 `.env.local` 优先级最高且不会被 git 跟踪，适合存放本地 secrets。

**Q: 如何获取 MiniMax API Key？**
A: 访问 https://platform.minimaxi.com/ 注册并创建 API Key。

**Q: 如何在代码中使用？**
A: `process.env.MINIMAX_API_KEY` 在 Node.js 服务端可直接访问。
