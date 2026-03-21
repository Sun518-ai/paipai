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
// Debounce timer reference
let saveTimer: ReturnType<typeof setTimeout> | null = null;
// Track which keys have pending changes (to merge properly)
let pendingKeys = new Set<string>();
// Cached recordId from Bitable (to avoid re-fetching on every save)
let cachedRecordId: string | null = null;

export function saveHybrid(localKey: string, data: unknown): void {
  // Always save to localStorage immediately (this is the source of truth for local reads)
  try { localStorage.setItem(localKey, JSON.stringify(data)); } catch {}

  // Mark this key as pending
  pendingKeys.add(localKey);

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    const keysToSave = new Set(pendingKeys);
    pendingKeys.clear();

    try {
      // Build the full data object for Bitable:
      // Start with whatever is currently in localStorage (most up-to-date local state)
      // Then overlay the pending changes
      const fullData: Record<string, unknown> = {};
      const allKeys = ['paipai-insects', 'paipai-photos', 'paipai-countdown', 'paipai-todos'];

      for (const key of allKeys) {
        if (keysToSave.has(key)) {
          // Use the pending data (just saved to localStorage)
          try {
            const fromLocal = localStorage.getItem(key);
            if (fromLocal) fullData[key] = JSON.parse(fromLocal);
          } catch {}
        } else {
          // Keep whatever we have in fullData (loaded from Bitable or previous iteration)
        }
      }

      // If we don't have cached recordId, fetch from Bitable
      if (cachedRecordId === null) {
        const loaded = await loadAllData();
        cachedRecordId = loaded.recordId;
        // Merge Bitable data for non-pending keys
        for (const key of allKeys) {
          if (!keysToSave.has(key) && loaded.data[key] !== undefined) {
            fullData[key] = loaded.data[key];
          }
        }
      }

      const newId = await saveAllData(cachedRecordId, fullData);
      if (newId) cachedRecordId = newId;
    } catch {}
  }, 2000);
}
