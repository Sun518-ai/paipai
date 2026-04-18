# HTML预览生成器 - 变量解析与高亮 PRD（子需求1）

## 1. Concept & Vision

用户可以在左栏输入一段功能描述文本，该描述可以包含 `{变量名}` 占位符。系统实时解析并高亮显示所有变量，一键生成结构化参数声明 JSON。本功能是整个 HTML 预览生成器的基础输入层。

## 2. 用户故事

**作为** 用户
**我** 在描述文本中使用 `{变量名}` 语法声明参数
**从而** 让 AI 理解需要哪些输入项，并自动生成对应的参数控件

## 3. 功能详情

### 3.1 变量语法高亮

- textarea 中实时识别 `{变量名}` 模式
- 变量显示为 **indigo 背景色** 高亮（浅色/深色模式适配）
- 覆盖层方案：div 叠加在 textarea 上，完全同步滚动位置
- 光标颜色正常显示（caretColor 设为 currentColor）

### 3.2 变量解析

- 正则提取：`/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g`
- 变量名规则：字母或下划线开头，后接字母数字下划线
- 解析结果包含：name / raw / start / end / isDuplicate
- 重复变量检测：同一变量名出现多次时提示

### 3.3 智能类型推断

根据变量名推断字段类型：

| 推断规则 | 类型 |
|---------|------|
| 含 password/pass/secret/key | password |
| 含 email/mail | email |
| 含 url/link | url |
| 含 count/num/number/age/year/price | number |
| 含 boolean/bool/enable/disabled/visible | boolean |
| 含 select/choice/option/mode/type/category | select |
| 默认 | text |

### 3.4 参数控件生成

- 每个变量生成一个控件配置（type / label / default / options）
- 支持类型切换（text / number / password / email / url / boolean / select）
- select 类型支持增删选项
- boolean 类型：开关按钮（true/false）
- number 类型：数字输入框，支持加减

### 3.5 JSON 导出

- 一键复制生成的 JSON 入参声明到剪贴板
- JSON 格式：
  ```json
  {
    "username": { "type": "text", "label": "用户名", "default": "" },
    "rememberMe": { "type": "boolean", "label": "记住我", "default": false }
  }
  ```

## 4. 验收标准

1. ✅ 输入 `{username}` 后立即显示 indigo 背景色高亮
2. ✅ 两个 `{username}` 都高亮，且提示重复
3. ✅ 切换变量类型后，控件 UI 正确响应（boolean 显示开关，select 显示选项列表）
4. ✅ 点击"复制 JSON"后，剪贴板内容正确
5. ✅ dark mode 下高亮颜色正确适配
6. ✅ textarea 支持 Tab 缩进
7. ✅ 空输入时显示引导提示，不崩溃
