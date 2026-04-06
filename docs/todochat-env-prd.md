# PRD: TodoChat MiniMax API Key 环境变量配置

## 1. 背景与目标

### 背景
派派点子站（TodoChat）需要接入 MiniMax AI SDK 以提供智能对话功能。当前缺少环境变量配置机制，API Key 无法安全管理。

### 目标
- 建立 `.env.local` 环境变量配置模板
- 配置 `MINIMAX_API_KEY` 供 AI SDK 使用
- 确保 API Key 不暴露在前端（不含 `NEXT_PUBLIC_` 前缀）

---

## 2. 功能需求

### 2.1 环境变量模板
- 创建 `.env.local.example` 文件
- 包含 `MINIMAX_API_KEY` 配置项
- 注释说明用途

### 2.2 安全要求
- `.env.local` 必须被 `.gitignore` 忽略
- 不得使用 `NEXT_PUBLIC_` 前缀暴露 Key
- 示例文件仅含 placeholder 值

### 2.3 文件结构
```
paipai-vehicles/
├── .env.local.example    # ✅ 模板文件（被 git 跟踪）
├── .gitignore            # ✅ 忽略 .env.local
└── docs/
    ├── todochat-env-prd.md
    └── todochat-env-tech-doc.md
```

---

## 3. 验收标准

| 检查项 | 状态 |
|--------|------|
| `.env.local.example` 已创建 | ✅ |
| 内容包含 `MINIMAX_API_KEY` | ✅ |
| `.gitignore` 包含 `.env.local` | ✅ |
| 无 `NEXT_PUBLIC_` 暴露 | ✅ |
| PR 已合并 | ⏳ |

---

## 4. 非功能需求

- 不影响现有 Express 服务
- 仅配置文件变更，无业务逻辑修改
- 兼容后续 AI SDK 集成
