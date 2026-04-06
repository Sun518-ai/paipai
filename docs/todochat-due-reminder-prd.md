# TodoChat 到期提醒推送功能 PRD

## 1. Concept & Vision

在 TodoChat AI 助手中集成任务到期提醒推送能力，让用户在对话中直观地看到任务到期状态，并在任务临近到期时主动推送浏览器通知。功能无缝融入现有 TodoChat 界面，视觉提示醒目但不打扰。

## 2. 功能需求

### 2.1 到期状态显示
- 在 TodoChat 消息卡片中显示任务到期状态徽章
- 三种状态：正常（无徽章）、临近到期（🟠 橙色）、已过期（🔴 红色）
- 临近提醒阈值可配置（默认 1 小时/1 天）

### 2.2 浏览器通知推送
- 使用浏览器 Notification API
- 任务到期前触发提醒通知
- 通知内容：任务名称 + 剩余时间
- 需先获取用户授权

### 2.3 定时检测机制
- 使用 setInterval 每分钟检测一次到期任务
- 仅对未完成任务进行检测
- 已发送通知的任务不重复发送

### 2.4 配置选项
- 用户可设置提醒提前量：1小时、1天
- 用户可开启/关闭通知推送
- 配置存储在 localStorage

## 3. 数据模型

```typescript
interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  pinned: boolean;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  dueDate: number | null; // Unix timestamp (ms), null 表示无截止日期
}

interface ReminderConfig {
  enabled: boolean;
  advanceNotice: '1h' | '1d';
}
```

## 4. 交互流程

1. 用户在 TodoMVC 页面添加带截止日期的任务
2. 打开 TodoChat 时，自动加载任务列表
3. 系统每分钟检测是否有任务即将到期
4. 满足条件时：
   - 在 Chat 界面显示到期状态徽章
   - 发送浏览器通知
5. 用户点击通知可聚焦到 TodoMVC 页面

## 5. 成功标准

- ✅ TodoChat 显示任务到期状态徽章
- ✅ 到期前可配置时间发送浏览器通知
- ✅ 通知点击可跳转到 TodoMVC 页面
- ✅ `npm run build` 通过
- ✅ conventional commits 规范提交
