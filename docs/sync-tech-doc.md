# ☁️ 多设备同步功能 Tech Doc

## 1. 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/api/todos/sync/route.ts` | 新建 | Bitable 同步 API（GET + POST） |
| `src/app/ideas/todomcv/page.tsx` | 修改 | 集成同步逻辑 + 同步状态 UI |
| `src/lib/todoSyncStore.ts` | 新建 | 同步状态管理 Hook |
| `docs/sync-prd.md` | 新建 | 产品需求文档 |

## 2. 新建 API 路由

**`src/app/api/todos/sync/route.ts`**

```typescript
// GET: 拉取所有 Todo 记录
// POST: 批量同步本地 Todo 到 Bitable
```

使用现有的 Bitable API 封装（参考 `src/app/api/bitable/route.ts` 的模式），配置：
- `BITABLE_APP_TOKEN`: `RbB2bGUENaqvoUsJ0MQcJoQinIh`（来自任务上下文）
- `BITABLE_TODOS_TABLE_ID`: `tblBIQSAzYz9uG0x`（来自任务上下文，新建 Todo 专用表）

### Bitable 字段映射

| Bitable 字段 | API 字段 | 类型 |
|---|---|---|
| `name` | `text` | 文本 |
| `done` | `done` | 单选（`是`/`否`） |
| `pinned` | `pinned` | 单选（`是`/`否`） |
| `priority` | `priority` | 单选（P0/P1/P2/P3） |
| `createdAt` | `createdAt` | 数字（时间戳 ms） |
| `updatedAt` | `updatedAt` | 数字（时间戳 ms） |
| `dueDate` | `dueDate` | 数字（时间戳 ms，可为空） |
| `localId` | `localId` | 文本（唯一标识） |

## 3. Todo 接口扩展

在 `page.tsx` 中，`Todo` 接口新增 `localId` 字段（如果不存在则用 `id` 回退），新增 `recordId` 字段用于跟踪 Bitable 记录 ID。

## 4. 同步流程

### 4.1 初始化加载（useEffect）

```
loadHybrid(localStorage) → 显示本地数据
fetch('/api/todos/sync')  → 拉取 Bitable 数据
合并（以 updatedAt 为准）
saveHybrid → 更新本地
→ setTodos(合并后列表)
```

### 4.2 本地变更触发同步

```typescript
// debounced sync on todos change
useEffect(() => {
  const timer = setTimeout(() => syncToCloud(todos), 300);
  return () => clearTimeout(timer);
}, [todos]);
```

### 4.3 网络恢复触发同步

```typescript
useEffect(() => {
  const handleOnline = () => {
    setSyncStatus('syncing');
    syncToCloud(todos);
  };
  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}, [todos]);
```

## 5. 同步状态管理

使用 `useState<SyncStatus>` 管理状态，在页面顶部显示状态徽章：

```typescript
type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
```

状态转换：
- `idle` → 用户未触发同步
- `syncing` → 请求进行中
- `synced` → 同步成功（2秒后回归 `idle`）
- `offline` → 检测到离线
- `error` → 同步失败，显示错误提示

## 6. 冲突解决

当 Bitable 数据与本地数据不一致时，以 `updatedAt` 时间戳大为准：

```typescript
function mergeTodos(local: Todo[], remote: Todo[]): Todo[] {
  const map = new Map<string, Todo>();
  
  // 先写入本地数据
  for (const t of local) {
    map.set(t.localId, t);
  }
  
  // 用远程数据覆盖更新的记录
  for (const t of remote) {
    const existing = map.get(t.localId);
    if (!existing || t.updatedAt > existing.updatedAt) {
      map.set(t.localId, { ...t, recordId: t.recordId || existing?.recordId });
    }
  }
  
  return Array.from(map.values());
}
```

## 7. UI 变更

在页面右上角（主题切换按钮旁）添加同步状态指示器：

```tsx
// 同步状态指示器
<div className="flex items-center gap-1 text-xs">
  {syncStatus === 'syncing' && <span className="animate-spin">🔄</span>}
  {syncStatus === 'syncing' && <span className="text-gray-500">同步中...</span>}
  {syncStatus === 'synced' && <span className="text-green-500">✅ 已同步</span>}
  {syncStatus === 'offline' && <span className="text-amber-500">⚠️ 离线</span>}
  {syncStatus === 'error' && <span className="text-red-500">❌ 同步失败</span>}
</div>
```

样式与主题切换按钮对齐，保持整体视觉一致性。

## 8. Bitable 表初始化

需要手动在飞书 Bitable 中创建 TodoMVC 专用表，字段如上述映射。或者通过 API 自动创建（如果表不存在则自动初始化）。

## 9. Error Handling

| 错误场景 | 处理方式 |
|----------|----------|
| Bitable 请求超时 | 静默失败，本地数据保留，显示 error 状态 |
| 网络离线 | 切换到 offline 状态，恢复后自动重试 |
| Bitable API 429 | 指数退避重试（最多3次） |
| JSON 解析失败 | 记录错误，返回空数组 |
