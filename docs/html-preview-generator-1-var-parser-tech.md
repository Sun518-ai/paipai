# HTML预览生成器 - 变量解析与高亮 Tech Doc（子需求1）

## 文件结构

```
src/app/ideas/html-preview-generator/
├── page.tsx                          # 主页面（双栏布局 + 状态管理）
├── components/
│   ├── VariableHighlighter.tsx       # 带高亮的textarea
│   └── ParamGenerator.tsx             # 参数控件生成器
└── hooks/
    └── useVariableParser.ts          # 变量解析核心逻辑
```

## 核心技术方案

### 1. 语法高亮：覆盖层方案

```
┌─────────────────────────────────────┐
│  div.highlight-overlay (absolute)   │  ← pointer-events:none, 显示高亮
│  ┌─────────────────────────────┐   │
│  │ {username} + 普通文本        │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  textarea (relative, z-index:1)    │  ← 透明文字，caretColor 可见
│  ┌─────────────────────────────┐   │
│  │                            │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

- 两者 `position: absolute`，共享父容器
- 字体/字号/padding/line-height **完全一致**
- 滚动同步：`textarea.onscroll → highlight.scrollTop = ta.scrollTop`
- 高度同步：每次 input 事件触发 `ta.style.height = ta.scrollHeight`

### 2. 变量解析（useVariableParser.ts）

```typescript
VARIABLE_REGEX = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g

parseVariables(text)
  → { variables, plainText, uniqueNames, duplicates }
```

- 使用 `RegExp.exec()` 而非 `String.matchAll` 以获得 start/end 位置
- 每次调用需重置 `lastIndex = 0`
- `plainText` = 去掉所有 `{var}` 后的纯文本（传给 AI 用）

### 3. 智能类型推断

```
inferVariableType(name)
  → 遍历规则表，第一个匹配返回
  → 默认 "text"
```

### 4. ParamGenerator 状态

```typescript
controls: Control[]
Control: { name, type, label, default, options }
```

- `controls` 数量与 `uniqueNames` 同步（useEffect 监听 length 变化）
- 新增变量：继承推断类型 + 默认值
- 已有变量：保留用户修改过的 type/label/options

### 5. 复制 JSON

```typescript
navigator.clipboard.writeText(json)
  .then(() => setCopied(true))
  .catch(() => { /* fallback: selection approach */ })
```

## 已知问题与限制

1. **长文本性能**：覆盖层在每帧 input 重新渲染，高亮文本较长时可能有轻微延迟
2. **深色模式**：highlight div 背景色使用 `dark:` Tailwind 变体，需确保 Tailwind dark mode 已启用
3. **变量嵌套**：`{user.name}` 不支持（正则仅匹配简单变量名）
