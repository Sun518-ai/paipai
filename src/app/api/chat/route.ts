import { NextRequest, NextResponse } from 'next/server';
import { TOOLS, ToolName } from '@/lib/todoTools';

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';
const BITABLE_APP_TOKEN = 'RbB2bGUENaqvoUsJ0MQcJoQinIh';
const BITABLE_TABLE_ID = 'tblBIQSAzYz9uG0x';
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com';

// ─── Bitable Helpers ───────────────────────────────────────────────────────────

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

// ─── Tool Executor ────────────────────────────────────────────────────────────

async function executeTool(name: ToolName, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'create_todo': {
      const { text, priority = 'P3', dueDate, tags = [] } = args;
      const dueTs = dueDate ? new Date(dueDate as string).getTime() : undefined;
      const recordId = await createTodo(text as string, priority as string, dueDate as string | undefined, tags as string[]);
      return `✅ 已创建任务「${text}」${priority !== 'P3' ? `(优先级 ${priority})` : ''}${dueDate ? `，截止日期 ${dueDate}` : ''}`;
    }
    case 'list_todos': {
      const { filter = 'all', tag, priority } = args as { filter?: string; tag?: string; priority?: string };
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
    }
    case 'complete_todo': {
      const { text } = args;
      const ok = await completeTodo(text as string);
      return ok ? `✅ 「${text}」已完成！` : `找不到未完成的任务「${text}」`;
    }
    case 'delete_todo': {
      const { text } = args;
      const ok = await deleteTodo(text as string);
      return ok ? `🗑️ 「${text}」已删除` : `找不到任务「${text}」`;
    }
    default:
      return `未知工具: ${name}`;
  }
}

// ─── MiniMax API ──────────────────────────────────────────────────────────────

async function chatWithMiniMax(messages: Array<{ role: string; content: string }>, tools: unknown[]) {
  const response = await fetch(`${MINIMAX_BASE_URL}/v1/text/chatcompletion_v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'MiniMax-Text-01',
      messages,
      tools,
      tool_choice: 'auto',
      stream: false,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MiniMax API error: ${response.status} - ${text}`);
  }
  return response.json();
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json() as { messages: Array<{ role: string; content: string }> };

    if (!MINIMAX_API_KEY) {
      return NextResponse.json({ error: 'MINIMAX_API_KEY not configured' }, { status: 500 });
    }

    // First call - let MiniMax decide if it needs tools
    const aiResponse = await chatWithMiniMax(messages, TOOLS);

    const finishReason = aiResponse.choices?.[0]?.finish_reason;
    const toolCalls = aiResponse.choices?.[0]?.message?.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      // Execute tool calls
      const toolResults: Array<{ tool_call_id: string; name: string; content: string }> = [];
      for (const call of toolCalls) {
        const name = call.function?.name as ToolName;
        const args = JSON.parse(call.function?.arguments || '{}');
        const result = await executeTool(name, args);
        toolResults.push({ tool_call_id: call.id || '', name, content: result });
      }

      // Second call - return tool results to MiniMax
      const messagesWithResults = [
        ...messages,
        aiResponse.choices?.[0]?.message,
        { role: 'tool', tool_call_id: toolResults[0]?.tool_call_id, content: toolResults.map(r => `[${r.name}] ${r.content}`).join('\n') }
      ];

      const finalResponse = await chatWithMiniMax(messagesWithResults, TOOLS);
      const content = finalResponse.choices?.[0]?.message?.content || '处理完成';

      return NextResponse.json({ content, toolResults });
    }

    // No tool call - return direct response
    const content = aiResponse.choices?.[0]?.message?.content || '我没有理解，请再说一次';
    return NextResponse.json({ content });

  } catch (error) {
    console.error('[chat route]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
