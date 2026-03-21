// Local storage utilities for apps not using Feishu Bitable

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
