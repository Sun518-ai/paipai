# TodoChat 快速执行通路技术方案

## 1. 技术方案

### 1.1 整体架构

在 `TodoMCVPage` 组件中扩展输入检测逻辑：

```
用户输入事件
    ↓
检测是否以 "+" 开头
    ↓
是 → 提取消息内容 → setShowChat(true) → 传给 TodoChat
否 → 正常 addTodo()
```

### 1.2 关键设计决策

#### 决策一：输入检测时机
- **方案 A**：在 `onKeyDown` 中检测回车时判断
- **方案 B**：在 `onChange` 中实时检测
- **选择**：方案 A，仅在回车提交时检测，避免影响正常输入体验

#### 决策二：初始消息传递方式
- **方案 A**：TodoChat 新增 `initialMessage` prop
- **方案 B**：通过 state 提升传递
- **选择**：方案 A，最干净的实现，TodoChat 内部消化初始消息

### 1.3 输入检测逻辑

```typescript
const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') {
    const text = input.trim();
    if (!text) return;
    
    if (text.startsWith('+')) {
      // 快速通道：触发 TodoChat
      const chatMessage = text.slice(1).trim();
      if (chatMessage) {
        setInitialChatMessage(chatMessage);
        setShowChat(true);
      }
      setInput('');
    } else {
      // 正常流程：创建 Todo
      addTodo();
    }
  }
};
```

### 1.4 TodoChat 初始消息处理

```typescript
interface TodoChatProps {
  className?: string;
  initialMessage?: string;  // 新增
}

// 在 useEffect 中处理初始消息
useEffect(() => {
  if (initialMessage && messages.length === 0) {
    // 自动提交初始消息
    handleInitialSubmit(initialMessage);
  }
}, [initialMessage]);
```

---

## 2. 文件变更计划

### 2.1 新增文件
| 文件 | 描述 |
|------|------|
| `src/components/TodoChat.tsx` | 从 `feature/todochat-sse-streaming` 分支引入 |

### 2.2 修改文件
| 文件 | 修改内容 |
|------|----------|
| `src/app/ideas/todomcv/page.tsx` | 1. 添加 `initialChatMessage` state<br>2. 修改 `onKeyDown` 检测 `+` 开头<br>3. 传递 `initialMessage` 给 TodoChat<br>4. TodoChat 展开时自动提交初始消息 |

---

## 3. 实现细节

### 3.1 TodoChat Props 扩展

```typescript
interface TodoChatProps {
  className?: string;
  initialMessage?: string;  // 可选，初始消息
}
```

### 3.2 TodoChat 内部逻辑

1. 新增 `initialMessage` prop
2. 使用 `useEffect` 监听 `initialMessage` 变化
3. 如果有初始消息且消息列表为空，自动调用 `handleSubmit`
4. 使用 `isInitialSubmitRef` 防止重复提交

### 3.3 TodoMCVPage 状态

```typescript
const [initialChatMessage, setInitialChatMessage] = useState<string | null>(null);
```

### 3.4 输入处理

```typescript
// 将 onKeyDown 从:
onKeyDown={(e) => e.key === 'Enter' && addTodo()}

// 改为:
onKeyDown={(e) => {
  if (e.key === 'Enter') {
    const text = input.trim();
    if (!text) return;
    
    if (text.startsWith('+')) {
      const chatMessage = text.slice(1).trim();
      if (chatMessage) {
        setInitialChatMessage(chatMessage);
        setShowChat(true);
      }
      setInput('');
    } else {
      addTodo();
    }
  }
}}
```

### 3.5 TodoChat 传递

```typescript
{showChat && (
  <TodoChat 
    className="h-96" 
    initialMessage={initialChatMessage ?? undefined}
  />
)}
```

---

## 4. 边界情况处理

| 情况 | 处理方式 |
|------|----------|
| 只输入 `+` | 不触发任何操作，输入框清空 |
| 输入 `+   `（只有加号和空格）| 不触发任何操作 |
| 输入 `+abc` 后又正常添加 todo | 两次操作独立，互不影响 |
| TodoChat 已展开再输入 `+xxx` | 更新 `initialChatMessage`，自动提交 |
| TodoChat 未安装（`showChat=false`）| 先 `setShowChat(true)` 展开再传递消息 |

---

## 5. 测试计划

### 手动测试用例
1. 输入 `+ 今天天气`，验证 TodoChat 展开且消息正确
2. 输入 `买牛奶`，验证正常创建 Todo
3. 输入 `+`，验证无操作且输入框清空
4. 输入 `+  `（加号空格），验证无操作
5. 折叠 TodoChat 后输入 `+test`，验证展开
6. build 验证无错误
