# TodoChat UI 重构 PRD

## 1. 概述与目标

### 项目背景
当前 `TodoChat` 组件使用手动的 React `useState` 管理聊天消息状态，需要重构为使用 Vercel AI SDK 的 `useChat` hook，以获得更好的状态管理、流式响应支持和开发者体验。

### 目标
- 使用 `@ai-sdk/react` 的 `useChat` hook 替换手动状态管理
- 保持现有 UI 风格完全一致（Tailwind 渐变、暗黑模式等）
- 确保聊天 API 路由正确对接
- 提升代码可维护性和可扩展性

---

## 2. 功能需求

### 核心功能
1. **useChat Hook 集成**
   - 使用 `useChat` hook 管理 `messages`、`input`、`setInput`、`isLoading`、`error`
   - 配置 `api` 属性指向 `/api/chat` 路由
   - 支持快捷建议发送功能

2. **UI 交互保持不变**
   - 悬浮按钮展开/收起聊天面板
   - 消息气泡（用户右对齐蓝色，助手左对齐灰色）
   - 加载动画（三个跳动的点）
   - 快捷建议按钮
   - 输入框 + 发送按钮
   - 暗黑模式支持

---

## 3. 完成标准

- [ ] `@ai-sdk/react` 包已添加
- [ ] `useChat` hook 正确导入和配置
- [ ] UI 交互与重构前完全一致
- [ ] 暗黑模式正常工作
- [ ] `npm run build` 通过
- [ ] PR 创建到 `Sun518-ai/paipai`
- [ ] 飞书任务状态更新为 done
