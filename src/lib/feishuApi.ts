// Shared Feishu API utilities

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';

let tokenCache = '';
let tokenExpire = 0;

/**
 * Get a valid Feishu tenant access token, or null if unavailable.
 * Caches tokens until 60s before expiry.
 */
export async function getToken(): Promise<string | null> {
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
 * Make an authenticated request to the Feishu Open API.
 * Throws if the token is unavailable or the API returns a non-zero code.
 */
export async function bitableRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<{ code?: number; msg?: string; data?: unknown }> {
  const token = await getToken();
  if (!token) throw new Error('no_token');
  const opts: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://open.feishu.cn/open-apis${path}`, opts);
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  const json = await res.json() as { code?: number; msg?: string; data?: unknown };
  if (json.code !== undefined && json.code !== 0) throw new Error(`Feishu_${json.code}:${json.msg}`);
  return json;
}
