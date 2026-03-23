/**
 * Mira Skill 报名数据存储 — 飞书多维表格
 */

export interface MiraSkillRegistration {
  record_id?: string;
  name: string;
  employeeId: string;
  department: string;
  feishuEmail: string;
  techDirection: string;
  firstSkill: string;
  submittedAt?: string;
}

const STORAGE_KEY = 'paipai-mira-registrations';

export async function submitRegistration(data: MiraSkillRegistration): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/mira-skill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.ok) return { ok: false, error: json.error };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function saveRegistrationsLocal(registrations: MiraSkillRegistration[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
}

export function loadRegistrationsLocal(): MiraSkillRegistration[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}
