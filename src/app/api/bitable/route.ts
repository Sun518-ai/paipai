import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';
const BITABLE_APP_TOKEN = process.env.FEISHU_BITABLE_APP_TOKEN || 'RbB2bGUENaqvoUsJ0MQcJoQinIh';
const BITABLE_TABLE_ID = process.env.FEISHU_BITABLE_TABLE_ID || 'tblwuTBsKwwoMir6';

let tokenCache = '';
let tokenExpire = 0;

async function getToken(): Promise<string | null> {
  if (tokenCache && tokenCache.length > 0 && Date.now() < tokenExpire - 60000) return tokenCache;
  try {
    const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
    });
    const json = await res.json();
    tokenCache = json.tenant_access_token as string;
    tokenExpire = Date.now() + (json.expire_in || 7200) * 1000;
    return tokenCache;
  } catch {
    return null;
  }
}

async function bitableRequest(method: string, path: string, body?: Record<string, unknown>) {
  const token = await getToken();
  if (!token) throw new Error('no_token');
  const res = await fetch(`https://open.feishu.cn/open-apis${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP_${res.status}:${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function GET() {
  try {
    const RARITY_REVERSE: Record<string, string> = {
      '普通': 'common', '稀有': 'uncommon', '珍稀': 'rare', '传说': 'legendary',
    };
    const data = await bitableRequest(
      'GET',
      `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records?page_size=100`
    ) as { data?: { items?: Array<{ record_id: string; fields: Record<string, unknown> }> } };
    const items = data?.data?.items || [];
    const insects = items.map((item) => ({
      _recordId: item.record_id,
      id: item.fields.name as string || '',
      name: item.fields.name as string || '',
      type: item.fields.type as string || '其他',
      rarity: RARITY_REVERSE[item.fields.rarity as string] || 'common',
      description: item.fields.description as string || '',
      location: item.fields.location as string || '',
      dateFound: item.fields.dateFound
        ? new Date(item.fields.dateFound as number).toISOString().split('T')[0]
        : '',
      notes: item.fields.notes as string || '',
      photo: (() => {
        const p = item.fields.photo;
        if (!p) return '';
        if (typeof p === 'string') return p;
        if (Array.isArray(p) && p.length > 0) {
          const first = p[0] as Record<string, unknown>;
          return (first.url as string) || (first.tmp_url as string) || '';
        }
        return '';
      })(),
    }));
    return NextResponse.json({ ok: true, insects });
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
    if (body.action === 'upload_photo') {
      const { fileData, fileName } = body as { fileData?: string; fileName?: string };
      const token = await getToken();
      if (!token) throw new Error('no_token');
      const binary = Buffer.from((fileData || '').replace(/^data:[^,]+,/, ''), 'base64');
      const form = new FormData();
      form.append('file_name', fileName || 'photo.jpg');
      form.append('parent_type', 'bitable_image');
      form.append('parent_node', BITABLE_APP_TOKEN);
      form.append('size', String(binary.length));
      form.append('file', new Blob([binary]), fileName || 'photo.jpg');
      const uploadRes = await fetch('https://open.feishu.cn/open-apis/drive/v1/files/upload_all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await uploadRes.json() as { code?: number; data?: { file_token?: string } };
      if (json.code === 0 && json.data?.file_token) {
        const tok = json.data.file_token;
        return NextResponse.json({
          ok: true, fileToken: tok,
          url: `https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?file_token=${tok}`,
        });
      }
      return NextResponse.json({ ok: false, error: 'upload failed' }, { status: 500 });
    }

    if (body.action === 'delete') {
      const { recordId } = body as { recordId?: string };
      await bitableRequest(
        'DELETE',
        `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${recordId}`
      );
      return NextResponse.json({ ok: true });
    }

    // upsert insect
    const insect = (body.insect || {}) as Record<string, unknown>;
    const RARITY_MAP: Record<string, string> = {
      common: '普通', uncommon: '稀有', rare: '珍稀', legendary: '传说',
    };

    const fields: Record<string, unknown> = {};
    if (insect.name) fields.name = insect.name;
    if (insect.type) fields.type = insect.type;
    if (insect.rarity) fields.rarity = RARITY_MAP[insect.rarity as string] || insect.rarity;
    if (insect.description) fields.description = insect.description;
    if (insect.location) fields.location = insect.location;
    if (insect.notes) fields.notes = insect.notes;
    if (insect.photo) {
      // Handle both string URL and array attachment format
      if (typeof insect.photo === 'string') {
        fields.photo = insect.photo;
      } else if (Array.isArray(insect.photo)) {
        fields.photo = insect.photo;
      }
    }
    if (insect.dateFound) {
      const ts = new Date(insect.dateFound as string).getTime();
      if (!isNaN(ts)) fields.dateFound = ts;
    }

    if (insect._recordId) {
      await bitableRequest(
        'PUT',
        `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${insect._recordId}`,
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
