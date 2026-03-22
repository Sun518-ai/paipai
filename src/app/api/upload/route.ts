import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';

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

/**
 * 图片上传接口 — 接收 FormData（文件），上传到飞书 Drive，返回 file_token
 * 前端直接上传文件，不走 base64 JSON，避开大小限制
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getToken();
    if (!token) return NextResponse.json({ ok: false, error: 'no_token' }, { status: 500 });

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ ok: false, error: 'no file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    const feishuForm = new FormData();
    feishuForm.append('file_name', file.name || 'photo.jpg');
    feishuForm.append('parent_type', 'bitable_image');
    feishuForm.append('parent_node', 'RbB2bGUENaqvoUsJ0MQcJoQinIh');
    feishuForm.append('size', String(buffer.length));
    feishuForm.append('file', new Blob([buffer]), file.name || 'photo.jpg');

    const res = await fetch('https://open.feishu.cn/open-apis/drive/v1/files/upload_all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: feishuForm,
    });

    const json = await res.json() as { code?: number; data?: { file_token?: string } };
    if (json.code !== 0 || !json.data?.file_token) {
      return NextResponse.json({ ok: false, error: `upload failed: ${json.code}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, fileToken: json.data.file_token });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
