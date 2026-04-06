// Todo sync utilities - Bitable cloud sync

import { loadHybrid, saveHybrid } from './localStore';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface Todo {
  id: string;
  localId: string;
  recordId?: string;
  text: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  dueDate?: number;
}

export async function fetchFromCloud(): Promise<{ todos: Todo[]; lastSync: number | null }> {
  try {
    const res = await fetch('/api/todos/sync', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as { ok: boolean; todos: Todo[]; lastSync: number | null; error?: string };
    if (!json.ok) throw new Error(json.error || 'unknown error');
    return { todos: json.todos || [], lastSync: json.lastSync };
  } catch (e) {
    console.warn('[todoSync] fetchFromCloud failed:', e);
    return { todos: [], lastSync: null };
  }
}

export async function pushToCloud(todos: Todo[]): Promise<boolean> {
  try {
    const res = await fetch('/api/todos/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todos }),
    });
    if (!res.ok) return false;
    const json = await res.json() as { ok: boolean };
    return json.ok === true;
  } catch (e) {
    console.warn('[todoSync] pushToCloud failed:', e);
    return false;
  }
}

export function mergeTodos(local: Todo[], remote: Todo[]): Todo[] {
  const map = new Map<string, Todo>();

  // Local entries first (local is source of truth for user's latest action)
  for (const t of local) {
    map.set(t.localId, t);
  }

  // Override with remote if it's newer
  for (const t of remote) {
    const existing = map.get(t.localId);
    if (!existing || t.updatedAt > existing.updatedAt) {
      // Preserve local recordId if remote doesn't have one
      map.set(t.localId, {
        ...t,
        recordId: t.recordId || existing?.recordId,
      });
    }
  }

  return Array.from(map.values());
}

export async function loadAndMergeTodos(localKey = 'paipai-todos'): Promise<{
  todos: Todo[];
  status: SyncStatus;
}> {
  const localTodos = await loadHybrid<Todo[]>(localKey, []);

  // Check if online
  if (!navigator.onLine) {
    return { todos: localTodos, status: 'offline' };
  }

  try {
    const { todos: remoteTodos } = await fetchFromCloud();
    const merged = mergeTodos(localTodos, remoteTodos);
    saveHybrid(localKey, merged);
    return { todos: merged, status: 'synced' };
  } catch {
    return { todos: localTodos, status: 'error' };
  }
}
