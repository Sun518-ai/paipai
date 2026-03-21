import { NextRequest, NextResponse } from 'next/server';

// Feishu app credentials — stored in Vercel environment variables (not exposed to browser)
const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';
const BITABLE_APP_TOKEN = process.env.FEISHU_BITABLE_APP_TOKEN || 'RbB2bGUENaqvoUsJ0MQcJoQinIh';
const BITABLE_TABLE_ID = process.env.FEISHU_BITABLE_TABLE_ID || 'tblJ41v89BGDT2CM';

const BITABLE_FILE = 'paipai-data.json';

interface BitableRecord {
  record_id: string;
  fields: Record<string, unknown>;
}

interface BitableResponse {
  data?: {
    items?: BitableRecord[];
    record?: BitableRecord;
  };
  code: number;
  msg?: string;
}

async function getTenantToken(): Promise<string | null> {
  try {
    const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.tenant_access_token as string;
  } catch {
    return null;
  }
}

// Token cache (in-memory, per serverless instance)
let tokenCache: string | null = null;
let tokenExpire = 0;

async function getCachedToken(): Promise<string | null> {
  if (tokenCache && Date.now() < tokenExpire - 60000) return tokenCache;
  const token = await getTenantToken();
  if (token) {
    tokenCache = token;
    tokenExpire = Date.now() + 2 * 60 * 60 * 1000; // ~2h
  }
  return token;
}

async function bitableRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const token = await getCachedToken();
  if (!token) throw new Error('Failed to get Feishu token');

  return fetch(`https://open.feishu.cn/open-apis${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function loadAllData(): Promise<{ recordId: string | null; data: Record<string, unknown> }> {
  try {
    const res = await bitableRequest(
      'GET',
      `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records?page_size=10`
    );
    if (!res.ok) return { recordId: null, data: {} };
    const json: BitableResponse = await res.json();
    const items = json.data?.items || [];
    if (items.length === 0) return { recordId: null, data: {} };

    const record = items[0];
    const text = record.fields?.['json_data'] as string;
    if (!text) return { recordId: record.record_id, data: {} };

    try {
      return { recordId: record.record_id, data: JSON.parse(text) };
    } catch {
      return { recordId: record.record_id, data: {} };
    }
  } catch {
    return { recordId: null, data: {} };
  }
}

async function saveAllData(
  recordId: string | null,
  data: Record<string, unknown>
): Promise<string | null> {
  try {
    const payload = {
      fields: { 'app_key': 'paipai', 'json_data': JSON.stringify(data) },
    };

    if (recordId) {
      const res = await bitableRequest(
        'PUT',
        `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${recordId}`,
        payload
      );
      if (!res.ok) return null;
      return recordId;
    } else {
      const res = await bitableRequest(
        'POST',
        `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records`,
        payload
      );
      if (!res.ok) return null;
      const json: BitableResponse = await res.json();
      return json.data?.record?.record_id || null;
    }
  } catch {
    return null;
  }
}

// GET /api/bitable — load all data
export async function GET(_req: NextRequest) {
  try {
    const { recordId, data } = await loadAllData();
    return NextResponse.json({ ok: true, recordId, data });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to load data' }, { status: 500 });
  }
}

// POST /api/bitable — save all data
export async function POST(req: NextRequest) {
  try {
    const { recordId, data } = await req.json();
    const savedRecordId = await saveAllData(recordId || null, data || {});
    return NextResponse.json({ ok: true, recordId: savedRecordId });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to save data' }, { status: 500 });
  }
}
