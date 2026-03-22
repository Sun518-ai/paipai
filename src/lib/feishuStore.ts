/**
 * 昆虫百科数据存储 — 飞书多维表格
 * photo 存储: file_token 字符串 (格式: "file_token:xxx")
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
  /** file_token string (file_token:xxx) or base64 legacy data URL */
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
 * 失败时返回空字符串（前端降级为 base64 或不显示图片）
 */
export async function uploadPhotoToCloud(fileData: string, fileName: string): Promise<string> {
  // 已经是 file_token 格式，直接返回
  if (fileData.startsWith('file_token:')) return fileData;
  // 已经是完整URL，跳过
  if (fileData.startsWith('http')) return fileData;
  // base64 data URL → 上传到飞书 Drive
  if (fileData.startsWith('data:')) {
    try {
      const res = await fetch('/api/bitable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload_photo', fileData, fileName }),
      });
      if (!res.ok) return '';
      const json = await res.json();
      if (!json.ok || !json.fileToken) return '';
      return `file_token:${json.fileToken}`;
    } catch {
      return '';
    }
  }
  return '';
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
