import { NextRequest } from 'next/server';
import { streamText, tool } from 'ai';
import { zodSchema } from '@ai-sdk/provider-utils';
import { getModel } from '@/lib/aiProvider';
import { z } from 'zod';

// ─── Bitable Helpers ───────────────────────────────────────────────────────────

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';
const BITABLE_APP_TOKEN = 'RbB2bGUENaqvoUsJ0MQcJoQinIh';
const BITABLE_TABLE_ID = 'tblBIQSAzYz9uG0x';

let tokenCache = '';
let tokenExpire = 0;

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenExpire - 60000) return tokenCache;
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const json = await res.json() as { tenant_access_token?: string; expire_in?: number };
  if (!json.tenant_access_token) throw new Error('no_token');
  tokenCache = json.tenant_access_token;
  tokenExpire = Date.now() + (json.expire_in || 7200) * 1000;
  return tokenCache;
}

async function bitableRequest(method: string, path: string, body?: Record<string, unknown>) {
  const token = await getToken();
  const opts: RequestInit = { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://open.feishu.cn/open-apis${path}`, opts);
  const json = await res.json() as { code?: number; msg?: string; data?: unknown };
  if (json.code !== undefined && json.code !== 0) throw new Error(`Feishu_${json.code}:${json.msg}`);
  return json;
}

interface Todo {
  id: string;
  text: string;
  done: boolean;
  pinned: boolean;
  priority: string;
  tagIds: string[];
  dueDate?: number;
  createdAt: number;
  updatedAt: number;
  localId?: string;
  recordId?: string;
}

async function fetchTodos(): Promise<Todo[]> {
  const data = await bitableRequest(
    'GET',
    `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records?page_size=500`
  ) as { data?: { items?: Array<{ record_id: string; fields: Record<string, unknown> }> } };
  const items = data?.data?.items || [];
  return items.map((item) => ({
    id: (item.fields.localId as string) || item.record_id,
    localId: (item.fields.localId as string) || item.record_id,
    recordId: item.record_id,
    text: (item.fields.name as string) || '',
    done: item.fields.done === '是' || item.fields.done === true,
    pinned: item.fields.pinned === '是' || item.fields.pinned === true,
    priority: (item.fields.priority as string) || 'P3',
    tagIds: (item.fields.tagIds as string[]) || [],
    dueDate: item.fields.dueDate as number | undefined,
    createdAt: (item.fields.createdAt as number) || Date.now(),
    updatedAt: (item.fields.updatedAt as number) || Date.now(),
  })).filter(t => t.text !== '');
}

async function createTodo(text: string, priority = 'P3', dueDate?: string, tags: string[] = []): Promise<string> {
  const now = Date.now();
  const localId = `local_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const result = await bitableRequest(
    'POST',
    `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records`,
    {
      fields: {
        name: text,
        done: '否',
        pinned: '否',
        priority,
        tagIds: tags,
        createdAt: now,
        updatedAt: now,
        localId,
      }
    }
  ) as { data?: { record?: { record_id: string } } };
  return result?.data?.record?.record_id || localId;
}

async function completeTodo(text: string): Promise<boolean> {
  const todos = await fetchTodos();
  const match = todos.find(t => t.text.includes(text) && !t.done);
  if (!match) return false;
  await bitableRequest(
    'PUT',
    `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${match.recordId}`,
    { fields: { done: '是', updatedAt: Date.now() } }
  );
  return true;
}

async function deleteTodo(text: string): Promise<boolean> {
  const todos = await fetchTodos();
  const match = todos.find(t => t.text.includes(text));
  if (!match) return false;
  await bitableRequest(
    'DELETE',
    `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${match.recordId}`
  );
  return true;
}

// ─── Tool Definitions (Vercel AI SDK v6 format) ─────────────────────────────────

const createTodoTool = tool({
  description: 'Create a new todo item. Use when user wants to add a task.',
  inputSchema: zodSchema(z.object({
    text: z.string().describe('Todo title/task description, e.g. "买鸡蛋", "完成项目报告"'),
    priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional().describe('Priority level. P0=紧急重要, P1=重要, P2=普通, P3=低'),
    dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format, e.g. "2026-04-10"'),
    tags: z.array(z.string()).optional().describe('Tags for the task, e.g. ["工作", "紧急"]'),
  })),
  execute: async ({ text, priority = 'P3', dueDate, tags = [] }) => {
    await createTodo(text, priority, dueDate, tags);
    return `✅ 已创建任务「${text}」${priority !== 'P3' ? `(优先级 ${priority})` : ''}${dueDate ? `，截止日期 ${dueDate}` : ''}`;
  },
});

const listTodosTool = tool({
  description: 'List all todo items. Use when user wants to see their tasks.',
  inputSchema: zodSchema(z.object({
    filter: z.enum(['all', 'active', 'done']).optional().describe('Filter by status: all (default), active (undone), done'),
    tag: z.string().optional().describe('Filter by tag name, e.g. "工作"'),
    priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional().describe('Filter by priority'),
  })),
  execute: async ({ filter = 'all', tag, priority }) => {
    const todos = await fetchTodos();
    let list = todos;
    if (filter === 'active') list = list.filter(t => !t.done);
    else if (filter === 'done') list = list.filter(t => t.done);
    if (tag) list = list.filter(t => t.tagIds?.includes(tag));
    if (priority) list = list.filter(t => t.priority === priority);
    if (list.length === 0) return '暂无任务';
    const lines = list.map((t, i) => {
      const status = t.done ? '✅' : '⬜';
      const pri = t.priority !== 'P3' ? ` [${t.priority}]` : '';
      const due = t.dueDate ? ` 📅${new Date(t.dueDate).toLocaleDateString('zh-CN')}` : '';
      return `${status} ${i + 1}. ${t.text}${pri}${due}`;
    });
    return `📋 共 ${list.length} 个任务：\n${lines.join('\n')}`;
  },
});

const completeTodoTool = tool({
  description: 'Mark a todo as completed. Use when user says "完成了", "done", "搞定" etc.',
  inputSchema: zodSchema(z.object({
    text: z.string().describe('The todo text to mark as done. Can be partial match.'),
  })),
  execute: async ({ text }) => {
    const ok = await completeTodo(text);
    return ok ? `✅ 「${text}」已完成！` : `找不到未完成的任务「${text}」`;
  },
});

const deleteTodoTool = tool({
  description: 'Delete a todo item permanently.',
  inputSchema: zodSchema(z.object({
    text: z.string().describe('The todo text to delete. Can be partial match.'),
  })),
  execute: async ({ text }) => {
    const ok = await deleteTodo(text);
    return ok ? `🗑️ 「${text}」已删除` : `找不到任务「${text}」`;
  },
});

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Validate API key is configured
    try {
      getModel();
    } catch {
      return new Response('MINIMAX_API_KEY is not configured', { status: 500 });
    }

    const { messages } = await req.json();

    const result = await streamText({
      model: getModel(),
      system: '你是一个友好的待办事项助手，帮助用户管理任务。用中文回复。',
      messages,
      tools: {
        createTodo: createTodoTool,
        listTodos: listTodosTool,
        completeTodo: completeTodoTool,
        deleteTodo: deleteTodoTool,
      },
    });

    return result.toUIMessageStreamResponse();

  } catch (error) {
    console.error('[chat route]', error);
    return new Response(String(error), { status: 500 });
  }
}
