/**
 * Paipai Data Store — Feishu Bitable backed
 * AppToken: RbB2bGUENaqvoUsJ0MQcJoQinIh
 * TableID: tblJ41v89BGDT2CM (fields: app_key, json_data)
 * All app data synced to Feishu Bitable for cross-device access.
 * Falls back to localStorage when offline.
 */

const BITABLE_APP_TOKEN = 'RbB2bGUENaqvoUsJ0MQcJoQinIh';
const BITABLE_TABLE_ID = 'tblJ41v89BGDT2CM';

let tokenCache: string | null = null;
let tokenExpire = 0;

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenExpire - 60000) return tokenCache;
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: 'cli_a934b5afcc5d5cd3',
      app_secret: '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw',
    }),
  });
  const data = await res.json();
  tokenCache = data.tenant_access_token as string;
  tokenExpire = Date.now() + (data.expire_in || 7200) * 1000;
  return tokenCache!;
}

// Load all data from Bitable
async function loadAllData(): Promise<{ recordId: string | null; data: Record<string, unknown> }> {
  try {
    const token = await getToken();
    const res = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records?page_size=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return { recordId: null, data: {} };
    const json = await res.json();
    const items = json.data?.items || [];
    if (items.length === 0) return { recordId: null, data: {} };
    const record = items[0];
    const text = record.fields?.['json_data'] as string;
    if (!text) return { recordId: record.record_id, data: {} };
    return { recordId: record.record_id, data: JSON.parse(text) };
  } catch {
    return { recordId: null, data: {} };
  }
}

// Save all data to Bitable (upsert)
async function saveAllData(recordId: string | null, data: Record<string, unknown>): Promise<string | null> {
  try {
    const token = await getToken();
    const payload = { fields: { 'app_key': 'paipai', 'json_data': JSON.stringify(data) } };
    if (recordId) {
      const res = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${recordId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) return null;
      return recordId;
    } else {
      const res = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json.data?.record?.record_id || null;
    }
  } catch {
    return null;
  }
}

// Hybrid load: try Bitable first, fall back to localStorage
export async function loadHybrid<T>(localKey: string, defaultValue: T): Promise<T> {
  try {
    const { data } = await loadAllData();
    if (data[localKey] !== undefined) {
      const result = data[localKey] as T;
      try { localStorage.setItem(localKey, JSON.stringify(result)); } catch {}
      return result;
    }
  } catch {}
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultValue;
}

// Save: always to localStorage immediately, debounced async sync to Bitable
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingRecordId: string | null = null;
let pendingData: Record<string, unknown> = {};

export function saveHybrid(localKey: string, data: unknown): void {
  try { localStorage.setItem(localKey, JSON.stringify(data)); } catch {}
  pendingData[localKey] = data;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      if (pendingRecordId === null) {
        const loaded = await loadAllData();
        pendingRecordId = loaded.recordId;
        pendingData = { ...loaded.data, ...pendingData };
      }
      const newId = await saveAllData(pendingRecordId, pendingData);
      if (newId) pendingRecordId = newId;
    } catch {}
  }, 2000);
}
