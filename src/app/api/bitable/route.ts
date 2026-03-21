import { NextRequest, NextResponse } from 'next/server';

// Feishu app credentials — stored in Vercel environment variables (not exposed to browser)
const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';
const BITABLE_APP_TOKEN = process.env.FEISHU_BITABLE_APP_TOKEN || 'IhKBbv4tHamKP3sFZaGctjAsnuf';
const BITABLE_TABLE_ID = process.env.FEISHU_BITABLE_TABLE_ID || 'tblU0anuwpzYb19W';

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

async function loadAllInsects(): Promise<{ recordId: string | null; insects: unknown[] }> {
  try {
    const res = await bitableRequest(
      'GET',
      `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records?page_size=10`
    );
    if (!res.ok) return { recordId: null, insects: [] };
    const json: BitableResponse = await res.json();
    const items = json.data?.items || [];
    if (items.length === 0) return { recordId: null, insects: [] };

    const record = items[0];
    const text = record.fields?.['json_data'] as string;
    if (!text) return { recordId: record.record_id, insects: [] };

    try {
      const parsed = JSON.parse(text);
      return { recordId: record.record_id, insects: parsed.insects || [] };
    } catch {
      return { recordId: record.record_id, insects: [] };
    }
  } catch {
    return { recordId: null, insects: [] };
  }
}

async function saveInsects(
  recordId: string | null,
  insects: unknown[]
): Promise<string | null> {
  try {
    const payload = {
      fields: { 'app_key': 'paipai-insects', 'json_data': JSON.stringify({ insects }) },
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

// GET /api/bitable — load insects data
export async function GET(_req: NextRequest) {
  try {
    const { recordId, insects } = await loadAllInsects();
    return NextResponse.json({ ok: true, recordId, insects });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to load insects' }, { status: 500 });
  }
}

// POST /api/bitable — save insects data
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const insects = body.insects || [];
    const currentRecordId = body.recordId || null;
    const savedRecordId = await saveInsects(currentRecordId, insects);
    return NextResponse.json({ ok: true, recordId: savedRecordId });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to save insects' }, { status: 500 });
  }
}
