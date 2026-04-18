# 🎨 HTML预览生成器 - 参数控件生成（子需求2）

## 技术方案

### 技术栈
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- localStorage 持久化

### 组件结构

```
components/
├── ParamGenerator.tsx   # 参数控件生成器
└── ParamPreview.tsx     # JSON 预览组件
```

### 类型定义

```typescript
interface Control {
  name: string;
  type: ControlType;
  label: string;
  default: string | number | boolean;
  options: string[];
}

type ControlType = "text" | "number" | "password" | "email" | "url" | "boolean" | "select";
```

### 智能类型推断

使用 `useVariableParser.ts` 中的 `inferVariableType` 函数：

| 变量名关键词 | 推断类型 |
|------------|---------|
| password/pass/secret/key | password |
| email/mail | email |
| url/link/href/src | url |
| count/num/number/age/year/price/size/width/height | number |
| boolean/bool/enable/disabled/visible/active/checked | boolean |
| select/choice/option/mode/type/category/role/status/level | select |
| 其他 | text |

### JSON 格式

生成格式：
```json
{
  "变量名": {
    "type": "text",
    "label": "标签名",
    "default": "默认值",
    "options": ["选项1", "选项2"]
  }
}
```

说明：
- `options` 字段仅在 `type === "select"` 时存在
- `default` 类型根据 type 变化：boolean 时为 true/false，number 时为数字

### 复制功能

```typescript
const copyJson = async () => {
  try {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = json;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
};
```

### 文件变更

| 文件 | 操作 | 说明 |
|-----|------|------|
| `components/ParamPreview.tsx` | 新增 | 独立 JSON 预览组件 |
| `components/ParamGenerator.tsx` | 重构 | 使用 ParamPreview 组件 |

### 依赖关系

```
ParamGenerator.tsx
├── useVariableParser.ts (inferVariableType, defaultControls)
└── ParamPreview.tsx (ParamControl interface)
```
