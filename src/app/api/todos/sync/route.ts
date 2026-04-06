import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';
const BITABLE_APP_TOKEN = process.env.FEISHU_TODOS_APP_TOKEN || 'RbB2bGUENaqvoUsJ0MQcJoQinIh';
const BITABLE_TABLE_ID = process.env.FEISHU_TODOS_TABLE_ID || 'tblBIQSAzYz9uG0x';

let tokenCache = '';
let tokenExpire = 0;

interface Todo {
  id: string;
  localId: string;
  recordId?: string;
  text: string;
  done: boolean;
  pinned: boolean;
  priority: string;
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
}

async function getToken(): Promise<string | null> {
  if (tokenCache.length > 0 && Date.now() < tokenExpire - 60000) return tokenCache;
  try {
    const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { tenant_access_token?: string; expire_in?: number };
    if (!json.tenant_access_token) return null;
    tokenCache = json.tenant_access_token;
    tokenExpire = Date.now() + (json.expire_in || 7200) * 1000;
    return tokenCache;
  } catch {
    return null;
  }
}

async function bitableRequest(method: string, path: string, body?: Record<string, unknown>) {
  const token = await getToken();
  if (!token) throw new Error('no_token');
  const opts: RequestInit = { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://open.feishu.cn/open-apis${path}`, opts);
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  const json = await res.json() as { code?: number; msg?: string };
  if (json.code !== undefined && json.code !== 0) throw new Error(`Feishu_${json.code}:${json.msg}`);
  return json;
}

export async function GET() {
  try {
    const data = await bitableRequest(
      'GET',
      `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records?page_size=500`
    ) as { data?: { items?: Array<{ record_id: string; fields: Record<string, unknown> }> } };

    const items = data?.data?.items || [];
    const todos: Todo[] = items.map((item) => ({
      id: (item.fields.localId as string) || item.record_id,
      localId: (item.fields.localId as string) || item.record_id,
      recordId: item.record_id,
      text: (item.fields.name as string) || '',
      done: item.fields.done === '是' || item.fields.done === true,
      pinned: item.fields.pinned === '是' || item.fields.pinned === true,
      priority: (item.fields.priority as string) || 'P3',
      createdAt: (item.fields.createdAt as number) || Date.now(),
      updatedAt: (item.fields.updatedAt as number) || Date.now(),
      dueDate: item.fields.dueDate as number | undefined,
    })).filter(t => t.text !== '');

    return NextResponse.json({ ok: true, todos, lastSync: Date.now() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), todos: [], lastSync: null }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
  }

  const todos = body.todos as Todo[] | undefined;
  if (!Array.isArray(todos)) {
    return NextResponse.json({ ok: false, error: 'todos is required' }, { status: 400 });
  }

  try {
    let synced = 0;
    for (const todo of todos) {
      const fields: Record<string, unknown> = {
        name: todo.text,
        done: todo.done ? '是' : '否',
        pinned: todo.pinned ? '是' : '否',
        priority: todo.priority,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
        localId: todo.localId,
      };
      if (todo.dueDate) {
        fields.dueDate = todo.dueDate;
      }

      if (todo.recordId) {
        // Update existing record
        await bitableRequest(
          'PUT',
          `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${todo.recordId}`,
          { fields }
        );
      } else {
        // Create new record
        const result = await bitableRequest(
          'POST',
          `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records`,
          { fields }
        ) as { data?: { record?: { record_id: string } } };
        // recordId will be returned but we don't need to update local here
        // (local is source of truth, next full sync will reconcile)
        void result;
      }
      synced++;
    }

    return NextResponse.json({ ok: true, synced, lastSync: Date.now() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
