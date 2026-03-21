/**
 * 昆虫百科数据存储 — 飞书多维表格（字段对应结构）
 * 每条昆虫 = 一条飞书记录，字段一一对应
 * AppToken: RbB2bGUENaqvoUsJ0MQcJoQinIh
 * TableID: tblwuTBsKwwoMir6（昆虫记录）
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
  photo: string; // base64 data URL: data:image/...;base64,...
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

export async function uploadPhotoToCloud(fileData: string, _fileName: string): Promise<string> {
  // 直接返回 base64 data URL，不上传到飞书 Drive
  // 前端 <img src={base64}> 可以直接渲染
  if (fileData.startsWith('data:')) return fileData;
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
