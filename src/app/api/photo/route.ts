/**
 * 图片代理接口 — 解决飞书图片 URL 需要鉴权 header 的问题
 * 前端调用 /api/photo?token=xxx 获取图片，API 代理请求飞书并返回二进制数据
 */

import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileToken = searchParams.get('token');

  if (!fileToken) {
    return NextResponse.json({ error: 'missing token' }, { status: 400 });
  }

  try {
    // 获取 token
    const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
    });
    const tokenJson = await tokenRes.json() as { tenant_access_token?: string };
    const token = tokenJson.tenant_access_token;
    if (!token) return NextResponse.json({ error: 'no token' }, { status: 500 });

    // 下载图片
    const imgRes = await fetch(
      `https://open.feishu.cn/open-apis/drive/v1/medias/${fileToken}/download`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!imgRes.ok) {
      return NextResponse.json({ error: `Feishu ${imgRes.status}` }, { status: 502 });
    }

    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
