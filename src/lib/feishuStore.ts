/**
 * 昆虫百科数据存储 — 飞书多维表格
 * photo 存储: file_token 字符串，写入 photoToken 文本字段
 * 前端显示: /api/photo?token=xxx → 代理飞书图片
 */

export interface Insect {
  _recordId?: string;
  id: string;
  name: string;
  type: string;
  rarity: string;
  description: string;
  location: string;
  dateFound: string;
  /** file_token 字符串，前端显示用 /api/photo?token=xxx */
  photo: string;
  stars: number;
  notes: string;
}

export async function loadInsectsFromCloud(): Promise<Insect[]> {
  try {
    const res = await fetch('/api/bitable');
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.ok || !json.insects) return [];
    return json.insects as Insect[];
  } catch {
    return [];
  }
}

export async function saveInsectToCloud(insect: Insect): Promise<void> {
  try {
    await fetch('/api/bitable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert', insect }),
    });
  } catch {}
}

export async function deleteInsectFromCloud(recordId: string): Promise<void> {
  try {
    await fetch('/api/bitable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', recordId }),
    });
  } catch {}
}

/**
 * 上传照片到飞书 Drive，返回 file_token 字符串
 * 使用 FormData 上传，绕过 base64 JSON 大小限制
 */
export async function uploadPhotoToCloud(file: File): Promise<string> {
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) return '';
    const json = await res.json();
    if (!json.ok || !json.fileToken) return '';
    return json.fileToken as string;
  } catch {
    return '';
  }
}

export async function loadInsectsHybrid(defaults: Insect[]): Promise<Insect[]> {
  const fromCloud = await loadInsectsFromCloud();
  if (fromCloud.length > 0) {
    localStorage.setItem('paipai-insects', JSON.stringify(fromCloud));
    return fromCloud;
  }
  try {
    const saved = localStorage.getItem('paipai-insects');
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaults;
}

export function saveInsectsLocal(insects: Insect[]): void {
  localStorage.setItem('paipai-insects', JSON.stringify(insects));
}
