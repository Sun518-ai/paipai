# TodoChat MiniMax Provider 统一封装 PRD

## 1. 背景与目标

当前 paipai 项目中 AI 能力分散在不同位置，缺乏统一的 AI SDK Provider 管理。封装统一的 MiniMax Provider 可以：
- 集中管理 API Key 配置
- 统一错误处理和重试逻辑
- 方便后续切换模型或 provider
- 减少重复代码

## 2. 功能需求

### 核心功能
- 创建 `src/lib/aiProvider.ts`，统一导出 MiniMax AI provider 实例
- 从 `process.env.MINIMAX_API_KEY` 读取 API Key
- 从 `process.env.MINIMAX_MODEL` 读取模型名称（默认 `MiniMax-Text-01`）
- 提供 `getModel()` 函数获取当前模型
- 提供 `createProvider()` 函数获取 provider 实例

### 安全需求
- API Key 不使用 `NEXT_PUBLIC_` 前缀（仅服务端可用）
- 提供环境变量缺失时的友好错误提示

## 3. 验收标准

1. `src/lib/aiProvider.ts` 可被 `src/app/api/chat/route.ts` 正确导入使用
2. 环境变量 `MINIMAX_API_KEY` 缺失时给出明确错误信息
3. 模型名称可通过 `MINIMAX_MODEL` 环境变量配置
4. TypeScript 类型检查通过
5. `npm run build` 通过
