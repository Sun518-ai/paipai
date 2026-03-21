import { NextRequest, NextResponse } from 'next/server';

const GIST_DESC = '派派点子站数据同步';
const GIST_FILE = 'paipai-data.json';

let cachedGistId: string | null = null;

async function ghFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not configured');
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
  });
}

async function getGistId(): Promise<string | null> {
  if (cachedGistId) return cachedGistId;
  try {
    const res = await ghFetch('https://api.github.com/gists');
    if (res.ok) {
      const gists = await res.json();
      const existing = gists.find(
        (g: { description?: string }) => g.description === GIST_DESC
      );
      if (existing) {
        cachedGistId = existing.id;
        return existing.id;
      }
    }
  } catch {}
  return null;
}

export async function GET() {
  try {
    const gistId = await getGistId();
    if (!gistId) return NextResponse.json({ data: {} });
    const res = await ghFetch(`https://api.github.com/gists/${gistId}`);
    if (!res.ok) return NextResponse.json({ data: {} });
    const gist = await res.json();
    const content = gist.files?.[GIST_FILE]?.content;
    if (!content) return NextResponse.json({ data: {} });
    return NextResponse.json({ data: JSON.parse(content) });
  } catch {
    return NextResponse.json({ data: {} });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { data } = await req.json();
    const gistId = await getGistId();
    const body = {
      description: GIST_DESC,
      public: false,
      files: { [GIST_FILE]: { content: JSON.stringify(data) } },
    };

    let res: Response;
    if (gistId) {
      res = await ghFetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    } else {
      res = await ghFetch('https://api.github.com/gists', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = await res.json();
        cachedGistId = json.id;
      }
    }
    return res.ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ ok: false }, { status: 500 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
