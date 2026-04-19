import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';
const BITABLE_APP_TOKEN = process.env.FEISHU_BITABLE_APP_TOKEN || 'RbB2bGUENaqvoUsJ0MQcJoQinIh';
const BITABLE_TABLE_ID = 'tblBqXnXODXRXNxZ';

let tokenCache = '';
let tokenExpire = 0;

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
      `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records?page_size=100`
    ) as { data?: { items?: Array<{ record_id: string; fields: Record<string, unknown> }> } };
    const items = data?.data?.items || [];
    const registrations = items.map((item) => ({
      record_id: item.record_id,
      name: item.fields['姓名'] as string || '',
      employeeId: item.fields['工号'] as string || '',
      department: item.fields['部门'] as string || '',
      feishuEmail: item.fields['飞书邮箱'] as string || '',
      techDirection: item.fields['技术方向'] as string || '',
      firstSkill: item.fields['第一个Skill'] as string || '',
      submittedAt: item.fields['提交时间']
        ? new Date(item.fields['提交时间'] as number).toISOString().split('T')[0]
        : '',
    }));
    return NextResponse.json({ ok: true, registrations });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
  }

  try {
    const { name, employeeId, department, feishuEmail, techDirection, firstSkill } = body as {
      name?: string;
      employeeId?: string;
      department?: string;
      feishuEmail?: string;
      techDirection?: string;
      firstSkill?: string;
    };

    if (!name || !employeeId || !department || !feishuEmail) {
      return NextResponse.json({ ok: false, error: '缺少必填字段' }, { status: 400 });
    }

    // 验证飞书邮箱格式
    if (!feishuEmail.includes('@')) {
      return NextResponse.json({ ok: false, error: '飞书邮箱格式不正确' }, { status: 400 });
    }

    const fields: Record<string, unknown> = {
      '姓名': name,
      '工号': employeeId,
      '部门': department,
      '飞书邮箱': feishuEmail,
      '技术方向': techDirection || '',
      '第一个Skill': firstSkill || '',
      '提交时间': Date.now(),
    };

    await bitableRequest(
      'POST',
      `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records`,
      { fields }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
