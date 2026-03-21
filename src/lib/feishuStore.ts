/**
 * Paipai Data Store — Feishu Bitable backed (via /api/bitable proxy)
 * Cross-device sync via Feishu Bitable through Next.js API route.
 * The API route calls Feishu server-side (no CORS issues).
 * Falls back to localStorage when offline.
 */

async function loadAllData(): Promise<{ recordId: string | null; data: Record<string, unknown> }> {
  try {
    const res = await fetch('/api/bitable');
    if (!res.ok) return { recordId: null, data: {} };
    const json = await res.json();
    if (!json.ok) return { recordId: null, data: {} };
    return { recordId: json.recordId || null, data: json.data || {} };
  } catch {
    return { recordId: null, data: {} };
  }
}

async function saveAllData(
  recordId: string | null,
  data: Record<string, unknown>
): Promise<string | null> {
  try {
    const res = await fetch('/api/bitable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, data }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.recordId || null;
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
  // Always save locally first (instant, no network needed)
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
