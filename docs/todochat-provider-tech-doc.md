# TodoChat MiniMax Provider 技术文档

## 技术方案

### 依赖
- `ai` - AI SDK 核心包
- `@ai-sdk/react` - React 集成
- `vercel-minimax-ai-provider` - MiniMax provider

### 文件结构
```
src/lib/aiProvider.ts   # 统一 provider 封装（新增）
src/app/api/chat/route.ts  # 使用 aiProvider（修改）
```

### aiProvider.ts 设计

```typescript
import { createMinimax } from 'vercel-minimax-ai-provider';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-Text-01';

if (!MINIMAX_API_KEY) {
  throw new Error('MINIMAX_API_KEY environment variable is not set');
}

export const minimaxProvider = createMinimax();
export const getModel = () => minimaxProvider(MINIMAX_MODEL);
```

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/aiProvider.ts` | 新增 | 统一 provider 封装 |
| `src/app/api/chat/route.ts` | 修改 | 使用 aiProvider |
| `package.json` | 修改 | 添加依赖 |
| `docs/todochat-provider-prd.md` | 新增 | PRD 文档 |
| `docs/todochat-provider-tech-doc.md` | 新增 | Tech Doc 文档 |
