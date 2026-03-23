import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';
// 独立的工程车救援站多维表格
const BITABLE_APP_TOKEN = process.env.FEISHU_RESCUE_APP_TOKEN || 'RbB2bGUENaqvoUsJ0MQcJoQinIh';
const BITABLE_TABLE_ID = process.env.FEISHU_RESCUE_TABLE_ID || 'tblSxi88abc123';

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

    const vehicles = items.map((item) => ({
      _recordId: item.record_id,
      id: (item.fields.id as string) || '',
      name: (item.fields.name as string) || '',
      type: (item.fields.type as string) || 'excavator',
      problem: (item.fields.problem as string) || '',
      fixed: (item.fields.fixed as boolean) || false,
      damageLevel: (item.fields.damageLevel as number) || 1,
      rescueDate: item.fields.rescueDate
        ? new Date(item.fields.rescueDate as number).toISOString().split('T')[0]
        : '',
      rescuedBy: (item.fields.rescuedBy as string) || '派派',
      notes: (item.fields.notes as string) || '',
    }));

    return NextResponse.json({ ok: true, vehicles });
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
    if (body.action === 'delete') {
      const { recordId } = body as { recordId?: string };
      await bitableRequest(
        'DELETE',
        `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${recordId}`
      );
      return NextResponse.json({ ok: true });
    }

    const vehicle = (body.vehicle || {}) as Record<string, unknown>;
    const fields: Record<string, unknown> = {};
    if (vehicle.id) fields.id = vehicle.id;
    if (vehicle.name) fields.name = vehicle.name;
    if (vehicle.type) fields.type = vehicle.type;
    if (vehicle.problem) fields.problem = vehicle.problem;
    if (vehicle.fixed !== undefined) fields.fixed = vehicle.fixed;
    if (vehicle.damageLevel !== undefined) fields.damageLevel = vehicle.damageLevel;
    if (vehicle.rescueDate) {
      const ts = new Date(vehicle.rescueDate as string).getTime();
      if (!isNaN(ts)) fields.rescueDate = ts;
    }
    if (vehicle.rescuedBy) fields.rescuedBy = vehicle.rescuedBy;
    if (vehicle.notes) fields.notes = vehicle.notes;

    if (vehicle._recordId) {
      await bitableRequest(
        'PUT',
        `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${vehicle._recordId}`,
        { fields }
      );
    } else {
      await bitableRequest(
        'POST',
        `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records`,
        { fields }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
