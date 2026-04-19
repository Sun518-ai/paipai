# TodoChat UI 重构技术文档

## 1. 概述

本文档描述如何将 TodoChat 组件从手动 `useState` 状态管理重构为使用 Vercel AI SDK 的 `useChat` hook。

## 2. 当前实现分析

### 当前代码结构
```tsx
// 手动状态管理
const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState('');
const [loading, setLoading] = useState(false);

// 手动发送逻辑
const send = async (text: string) => {
  // 手动 fetch /api/chat
  // 手动更新 messages state
  // 手动处理 loading state
};
```

## 3. 目标实现

### 使用 useChat hook
```tsx
import { useChat } from '@ai-sdk/react';

const { 
  messages,           // 消息列表
  input,              // 输入框值
  setInput,           // 设置输入框值
  handleSubmit,       // 提交处理
  append,             // 添加消息（用于快捷建议）
  isLoading,          // 加载状态
  error,              // 错误状态
} = useChat({
  api: '/api/chat',
});
```

## 4. 代码变更

### 4.1 安装依赖
```bash
npm install @ai-sdk/react
```

### 4.2 更新 TodoChat.tsx

**移除的代码：**
- `useState` for `messages`, `input`, `loading`
- 手动 `send` 函数
- 手动滚动 `useEffect`

**新增的代码：**
- `useChat` hook 导入
- `useChat` hook 调用
- 使用 `handleSubmit` 替代手动 `send`
- 使用 `append` 方法发送快捷建议

## 5. 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 修改 | 添加 `@ai-sdk/react` 依赖 |
| `src/components/TodoChat.tsx` | 重构 | 使用 useChat hook |
| `docs/todochat-ui-prd.md` | 新增 | 产品需求文档 |
| `docs/todochat-ui-tech-doc.md` | 新增 | 技术文档 |

## 6. 测试清单

- [ ] 页面加载正常
- [ ] 点击悬浮按钮展开/收起面板
- [ ] 输入文字并发送消息
- [ ] 快捷建议按钮正常工作
- [ ] 显示加载动画
- [ ] AI 响应正确显示
- [ ] 错误状态正确显示
- [ ] 暗黑模式正常工作
- [ ] `npm run build` 通过
