# TodoChat 富文本卡片展示技术文档

## 1. 技术方案

### 1.1 核心技术思路

采用**内容解析 + 组件映射**模式：
1. AI 回复文本经过解析器提取卡片内容
2. 解析后的卡片片段与普通文本片段混合
3. 渲染时根据片段类型选择对应组件

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────┐
│                  AI 回复文本                         │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              ContentParser.parse()                  │
│  - 正则匹配 :::type ... :::                         │
│  - 提取卡片内容 + 普通文本                           │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              ContentSegment[]                       │
│  [ {type:'text', content:'...' },                   │
│    {type:'task', content:[...] },                   │
│    {type:'summary', content:'...' } ]               │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              MessageRenderer                        │
│  - 遍历 segments                                    │
│  - type='text' → <p>                               │
│  - type='task' → <TaskCard>                        │
│  - type='summary' → <SummaryCard>                   │
│  - type='link' → <LinkCard>                        │
│  - type='data' → <DataCard>                        │
└─────────────────────────────────────────────────────┘
```

### 1.3 卡片解析正则

```typescript
// 任务卡片: :::task\n- [ ] ... \n:::
const TASK_REGEX = /:::task\n([\s\S]*?)\n:::/g;

// 摘要卡片: :::summary\n...\n:::
const SUMMARY_REGEX = /:::summary\n([\s\S]*?)\n:::/g;

// 链接卡片: :::link\nURL\n标题\n:::
const LINK_REGEX = /:::link\n([^\n]+)\n([^\n]*)\n:::/g;

// 数据卡片: :::data\n{...}\n:::
const DATA_REGEX = /:::data\n([\s\S]*?)\n:::/g;
```

## 2. 组件设计

### 2.1 文件结构

```
src/
├── components/
│   └── cards/
│       ├── index.ts                    # 导出所有卡片组件
│       ├── ContentParser.ts            # 内容解析器
│       ├── TaskCard.tsx                # 任务卡片
│       ├── SummaryCard.tsx             # 摘要卡片
│       ├── LinkCard.tsx                # 链接卡片
│       └── DataCard.tsx                # 数据卡片
```

### 2.2 类型定义

```typescript
// 内容片段类型
type SegmentType = 'text' | 'task' | 'summary' | 'link' | 'data';

interface BaseSegment {
  type: SegmentType;
}

interface TextSegment extends BaseSegment {
  type: 'text';
  content: string;
}

interface TaskSegment extends BaseSegment {
  type: 'task';
  tasks: Array<{ id: string; text: string; completed: boolean }>;
}

interface SummarySegment extends BaseSegment {
  type: 'summary';
  content: string;
  collapsed: boolean;
}

interface LinkSegment extends BaseSegment {
  type: 'link';
  url: string;
  title: string;
}

interface DataSegment extends BaseSegment {
  type: 'data';
  metrics: Record<string, string | number>;
}

type ContentSegment = TextSegment | TaskSegment | SummarySegment | LinkSegment | DataSegment;
```

### 2.3 任务卡片组件

```typescript
interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface TaskCardProps {
  tasks: Task[];
  onToggle?: (id: string) => void;
}
```

状态：
- `expanded`: boolean - 默认展开
- `tasks`: Task[] - 本地状态，勾选不影响原文本

### 2.4 摘要卡片组件

```typescript
interface SummaryCardProps {
  content: string;
}
```

状态：
- `collapsed`: boolean - 默认展开
- 最大折叠行数：3行

### 2.5 链接卡片组件

```typescript
interface LinkCardProps {
  url: string;
  title?: string;
}
```

### 2.6 数据卡片组件

```typescript
interface DataCardProps {
  metrics: Record<string, string | number>;
}
```

## 3. 实现要点

### 3.1 ContentParser 解析逻辑

```typescript
function parseContent(text: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  
  // 按顺序检测所有卡片标记
  const patterns = [
    { type: 'task', regex: TASK_REGEX },
    { type: 'summary', regex: SUMMARY_REGEX },
    { type: 'link', regex: LINK_REGEX },
    { type: 'data', regex: DATA_REGEX },
  ];
  
  // 收集所有匹配位置
  const matches: Array<{ index: number; length: number; type: SegmentType; content: string }> = [];
  
  for (const { type, regex } of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type,
        content: match[1],
      });
    }
  }
  
  // 按位置排序
  matches.sort((a, b) => a.index - b.index);
  
  // 生成片段
  for (const m of matches) {
    // 添加前面的文本
    if (m.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, m.index) });
    }
    // 添加卡片
    segments.push({ type: m.type, ...parseCardContent(m.type, m.content) });
    lastIndex = m.index + m.length;
  }
  
  // 添加剩余文本
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }
  
  return segments;
}
```

### 3.2 消息渲染器集成

修改 `MessageBubble` 组件：

```typescript
function MessageBubble({ message }) {
  const segments = parseContent(getMessageText(message));
  
  return (
    <div className="card-content">
      {segments.map((seg, i) => {
        switch (seg.type) {
          case 'task':
            return <TaskCard key={i} {...seg} />;
          case 'summary':
            return <SummaryCard key={i} {...seg} />;
          case 'link':
            return <LinkCard key={i} {...seg} />;
          case 'data':
            return <DataCard key={i} {...seg} />;
          default:
            return <p key={i}>{seg.content}</p>;
        }
      })}
    </div>
  );
}
```

### 3.3 暗黑模式支持

所有卡片组件使用 Tailwind 暗黑模式类：
- 背景：`dark:bg-slate-800`
- 边框：`dark:border-slate-700`
- 文字：`dark:text-slate-200`

## 4. 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新增 | `src/components/cards/index.ts` | 导出所有卡片组件 |
| 新增 | `src/components/cards/ContentParser.ts` | 内容解析器 |
| 新增 | `src/components/cards/TaskCard.tsx` | 任务卡片组件 |
| 新增 | `src/components/cards/SummaryCard.tsx` | 摘要卡片组件 |
| 新增 | `src/components/cards/LinkCard.tsx` | 链接卡片组件 |
| 新增 | `src/components/cards/DataCard.tsx` | 数据卡片组件 |
| 修改 | `src/app/ideas/chat/page.tsx` | 引入并使用卡片组件 |

## 5. 依赖

无新增依赖，使用现有：
- React hooks（内置）
- Tailwind CSS（已有）
- TypeScript（已有）
