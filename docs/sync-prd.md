# ☁️ 多设备同步功能 PRD

## 1. Concept & Vision

派派点子站的 TodoMVC 需要打破设备的边界，让用户在 Web、iOS、Android 任一设备上都能看到完全一致的任务列表。核心体验是「无感同步」——用户无需手动操作，云端数据实时更新；即使离线工作，也能在恢复网络后自动合并冲突，保持数据完整。

## 2. 用户故事

| 角色 | 场景 | 期望 |
|------|------|------|
| 派派爸 | 在 Mac Safari 上添加了一条待办 | 拿起 iPhone 打开网页，立刻能看到这条任务 |
| 派派妈 | 在 Android 手机上完成了任务 ✓ | Web 端刷新页面，任务已标记为完成 |
| 派派 | iPad 离线时标记完成 | 网络恢复后，Web 端同步显示已完成 |
| 任意用户 | 多设备同时操作同一任务 | 以最后修改时间为准，数据不丢失 |

## 3. 同步策略

### 方案选型
- **选型**：Bitable 云端存储（复用项目现有飞书 Bitable 基础设施）
- **优势**：无需新建数据库；已有 `/api/bitable/` 基础设施；飞书原生支持跨平台访问

### 同步架构
```
[TodoMVC 页面]
    ↓ loadHybrid / saveHybrid (localStorage 本地优先)
    ↓ debounced sync
[/api/todos/sync]  ← 新建 API 路由
    ↓
[飞书 Bitable TodoMVC 表]  ← 新建专用数据表 (tblBIQSAzYz9uG0x)
```

### 冲突解决
- **策略**：Last-Write-Wins（基于 `updatedAt` 时间戳）
- **原理**：每次保存带上时间戳，服务器取最新的记录覆盖旧记录
- **理由**：Todo 列表为个人数据，用户本地操作即为最新意图，无需复杂合并逻辑

### 离线支持
- localStorage 作为本地主存储（保证离线可用）
- 应用加载时：先从 Bitable 拉取 → 与 localStorage 合并 → 渲染
- 网络恢复后自动触发同步（`online` 事件监听）
- 同步状态实时显示在 UI（同步中 / 已同步 / 离线）

## 4. 功能需求

### 4.1 Bitable 数据表结构

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `name` | 文本 | 任务内容（对应 `Todo.text`） |
| `done` | 单选 | 完成状态（`true`/`false`） |
| `pinned` | 单选 | 置顶状态（`true`/`false`） |
| `priority` | 单选 | 优先级（P0/P1/P2/P3） |
| `createdAt` | 数字 | 创建时间戳（ms） |
| `updatedAt` | 数字 | 最后更新时间戳（ms，用于冲突解决） |
| `dueDate` | 数字 | 截止日期时间戳（ms，可选） |
| `localId` | 文本 | 本地 ID（保证跨设备创建的任务 ID 一致） |

### 4.2 API 设计

**GET `/api/todos/sync`**
- 作用：从 Bitable 拉取所有 Todo 记录
- 返回：`{ ok: boolean, todos: Todo[], lastSync: number }`

**POST `/api/todos/sync`**
- 作用：批量同步本地 Todo 到 Bitable
- 请求体：`{ todos: Todo[], lastSync: number }`
- 策略：遍历 todos，有 `recordId` 的更新，无 `recordId` 的新建
- 返回：`{ ok: boolean, synced: number }`

### 4.3 同步时机

| 触发时机 | 说明 |
|----------|------|
| 页面首次加载 | load 后立即从 Bitable 拉取并合并 |
| 本地变更后 | debounce 300ms 后自动推送到 Bitable |
| 网络恢复 | `window.online` 事件触发同步 |
| 手动刷新 | 页面可见性从 hidden 切回来时（可选） |

### 4.4 合并逻辑

```
1. 拉取 Bitable 全量记录 → remoteTodos
2. 读取 localStorage → localTodos
3. 以 localId 为 key，合并两者：
   - 如果 remote.updatedAt > local.updatedAt → 采纳 remote
   - 否则 → 保留 local（local 为最新操作）
4. 写入 localStorage 并渲染
```

### 4.5 UI - 同步状态指示器

在 TodoMVC 页面顶部导航栏添加同步状态徽章：

| 状态 | 显示 |
|------|------|
| 同步中（syncing） | 🔄 同步中... |
| 已同步（synced） | ✅ 已同步（淡出消失） |
| 离线（offline） | ⚠️ 离线模式 |
| 同步失败（error） | ❌ 同步失败（hover 显示原因） |

## 5. 数据模型

```typescript
interface Todo {
  id: string;          // 本地生成，36位随机字符串（genId）
  localId: string;    // 与 Bitable record 对应的稳定 ID
  recordId?: string;  // Bitable record ID（创建后写入）
  text: string;
  done: boolean;
  createdAt: number;  // ms
  updatedAt: number;  // ms，冲突解决用
  pinned: boolean;
  priority: Priority; // 'P0' | 'P1' | 'P2' | 'P3'
  dueDate?: number;   // ms，可选
}

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
```

## 6. 非功能性需求

- **兼容性**：Next.js 16.2 + React 19（已有环境不变）
- **性能**：Bitable 请求 debounce 300ms，避免频繁写
- **容错**：Bitable 请求失败不影响本地使用，显示错误提示
- **隐私**：所有数据通过飞书 Bitable 存储（已有隐私政策）

## 7. 成功标准

- ✅ 同一账号在两个浏览器标签页打开，修改一方，另一方实时更新
- ✅ 离线标记完成，网络恢复后同步成功
- ✅ 同步状态在 UI 正确显示（syncing / synced / offline）
- ✅ `npm run build` 通过
- ✅ conventional commits 规范提交
