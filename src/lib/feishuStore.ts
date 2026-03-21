/**
 * 昆虫百科数据存储 — 专属飞书多维表格
 * AppToken: IhKBbv4tHamKP3sFZaGctjAsnuf
 * TableID: tblU0anuwpzYb19W
 */

// ── 昆虫专用：飞书多维表格 ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedInsectRecordId: string | null = null;
let insectsTimer: ReturnType<typeof setTimeout> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadInsectsFromCloud(): Promise<{ insects: any[] | null; recordId: string | null }> {
  try {
    const res = await fetch('/api/bitable');
    if (!res.ok) return { insects: null, recordId: null };
    const json = await res.json();
    if (!json.ok || !json.insects) return { insects: null, recordId: null };
    if (json.recordId) cachedInsectRecordId = json.recordId;
    return { insects: json.insects, recordId: json.recordId || null };
  } catch {
    return { insects: null, recordId: null };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveInsectsToCloud(insects: any[]): Promise<void> {
  try {
    const res = await fetch('/api/bitable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insects, recordId: cachedInsectRecordId }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.recordId) cachedInsectRecordId = json.recordId;
    }
  } catch {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadInsectsHybrid(defaults: any[]): Promise<any[]> {
  const { insects } = await loadInsectsFromCloud();
  if (insects && insects.length > 0) {
    localStorage.setItem('paipai-insects', JSON.stringify(insects));
    return insects;
  }
  try {
    const saved = localStorage.getItem('paipai-insects');
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaults;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function saveInsectsHybrid(insects: any[]): void {
  localStorage.setItem('paipai-insects', JSON.stringify(insects));
  if (insectsTimer) clearTimeout(insectsTimer);
  insectsTimer = setTimeout(() => saveInsectsToCloud(insects), 2000);
}

// ── 通用：仅本地存储（其他应用）─────────────────────────────────

export async function loadHybrid<T>(localKey: string, defaultValue: T): Promise<T> {
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultValue;
}

export function saveHybrid(localKey: string, data: unknown): void {
  try { localStorage.setItem(localKey, JSON.stringify(data)); } catch {}
}
