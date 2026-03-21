import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';
const BITABLE_APP_TOKEN = process.env.FEISHU_BITABLE_APP_TOKEN || 'RbB2bGUENaqvoUsJ0MQcJoQinIh';
const BITABLE_TABLE_ID = process.env.FEISHU_BITABLE_TABLE_ID || 'tblwuTBsKwwoMir6';

let tokenCache = '';
let tokenExpire = 0;

async function getToken(): Promise<string | null> {
  if (tokenCache && Date.now() < tokenExpire - 60000) return tokenCache;
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
  if (!token) throw new Error('no token');
  const res = await fetch(`https://open.feishu.cn/open-apis${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
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
      rarity: item.fields.rarity as string || '普通',
      description: item.fields.description as string || '',
      location: item.fields.location as string || '',
      dateFound: item.fields.dateFound
        ? new Date(item.fields.dateFound as number).toISOString().split('T')[0]
        : '',
      notes: item.fields.notes as string || '',
      photo: item.fields.photo as string || '',
    }));
    return NextResponse.json({ ok: true, insects });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      action?: string;
      insect?: Record<string, unknown>;
      recordId?: string;
      fileData?: string;
      fileName?: string;
    };

    if (body.action === 'upload_photo') {
      const { fileData, fileName } = body;
      const token = await getToken();
      if (!token) throw new Error('no token');
      const binary = Buffer.from(fileData?.replace(/^data:[^,]+,/, '') || '', 'base64');
      const formData = new FormData();
      formData.append('file_name', fileName || 'photo.jpg');
      formData.append('parent_type', 'bitable_image');
      formData.append('parent_node', BITABLE_APP_TOKEN);
      formData.append('size', String(binary.length));
      formData.append('file', new Blob([binary]), fileName || 'photo.jpg');
      const uploadRes = await fetch('https://open.feishu.cn/open-apis/drive/v1/files/upload_all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadJson = await uploadRes.json() as { code?: number; data?: { file_token?: string } };
      if (uploadJson.code === 0 && uploadJson.data?.file_token) {
        const tok = uploadJson.data.file_token;
        return NextResponse.json({
          ok: true,
          fileToken: tok,
          url: `https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?file_token=${tok}`,
        });
      }
      return NextResponse.json({ ok: false, error: 'upload failed' }, { status: 500 });
    }

    if (body.action === 'delete') {
      await bitableRequest(
        'DELETE',
        `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${body.recordId}`
      );
      return NextResponse.json({ ok: true });
    }

    // upsert insect
    const insect = body.insect || {};
    const recordId = insect._recordId as string;
    const fields: Record<string, unknown> = {
      name: insect.name || '',
      type: insect.type || '其他',
      rarity: insect.rarity || '普通',
      description: insect.description || '',
      location: insect.location || '',
      notes: insect.notes || '',
      photo: insect.photo || '',
    };
    if (insect.dateFound) {
      fields.dateFound = new Date(insect.dateFound as string).getTime();
    }

    if (recordId) {
      await bitableRequest(
        'PUT',
        `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${recordId}`,
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
