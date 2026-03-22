import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';
const BITABLE_APP_TOKEN = process.env.FEISHU_COLLECTION_APP_TOKEN || 'TBD_CREATE_NEW';
const BITABLE_TABLE_ID = process.env.FEISHU_COLLECTION_TABLE_ID || 'TBD_CREATE_NEW';

let tokenCache = '';
let tokenExpire = 0;

async function getToken(): Promise<string | null> {
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

async function bitableRequest(method: string, path: string, body?: Record<string, unknown>) {
  const token = await getToken();
  if (!token) throw new Error('no_token');
  const opts: RequestInit = { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://open.feishu.cn/open-apis${path}`, opts);
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  const json = await res.json() as { code?: number; msg?: string };
  if (json.code !== undefined && json.code !== 0) throw new Error(`Feishu_${json.code}:${json.msg}`);
  return json;
}

// 10种工程车基础数据（内置，永远存在）
export const BASE_TRUCKS = [
  { id: 'excavator',   name: '挖掘机',       emoji: '🚜', category: '挖掘类', color: '#f59e0b', bgFrom: 'from-amber-400',   bgTo: 'to-orange-500',  soundUrl: 'https://www.soundjay.com/transportation/car-horn-01.wav' },
  { id: 'dump_truck',  name: '自卸卡车',     emoji: '🚚', category: '运输类', color: '#f97316', bgFrom: 'from-orange-400',  bgTo: 'to-red-500',     soundUrl: 'https://www.soundjay.com/transportation/car-horn-02.wav' },
  { id: 'crane',       name: '吊车',         emoji: '🏗️', category: '吊装类', color: '#64748b', bgFrom: 'from-slate-400',   bgTo: 'to-slate-600',   soundUrl: 'https://www.soundjay.com/mechanical/mechanical-01.wav' },
  { id: 'mixer',       name: '混凝土搅拌车', emoji: '🚛', category: '搅拌类', color: '#ef4444', bgFrom: 'from-red-400',     bgTo: 'to-rose-600',    soundUrl: 'https://www.soundjay.com/mechanical/mechanical-02.wav' },
  { id: 'bulldozer',   name: '推土机',       emoji: '🚜', category: '挖掘类', color: '#eab308', bgFrom: 'from-yellow-400',  bgTo: 'to-amber-500',   soundUrl: 'https://www.soundjay.com/mechanical/crunch-1.wav' },
  { id: 'roller',      name: '压路机',       emoji: '🔵', category: '碾压类', color: '#3b82f6', bgFrom: 'from-blue-400',    bgTo: 'to-indigo-500',  soundUrl: 'https://www.soundjay.com/mechanical/vibration-1.wav' },
  { id: 'fire_truck',  name: '消防车',       emoji: '🚒', category: '救援类', color: '#dc2626', bgFrom: 'from-red-500',     bgTo: 'to-red-700',     soundUrl: 'https://www.soundjay.com/transportation/fire-truck-horn.wav' },
  { id: 'tractor',     name: '拖拉机',       emoji: '🚜', category: '农业类', color: '#22c55e', bgFrom: 'from-green-400',    bgTo: 'to-emerald-600', soundUrl: 'https://www.soundjay.com/mechanical/engine-idle-1.wav' },
  { id: 'forklift',    name: '叉车',         emoji: '🔧', category: '搬运类', color: '#8b5cf6', bgFrom: 'from-violet-400',  bgTo: 'to-purple-600',  soundUrl: 'https://www.soundjay.com/mechanical/forklift-1.wav' },
  { id: 'flatbed',     name: '平板运输车',   emoji: '🛻', category: '运输类', color: '#06b6d4', bgFrom: 'from-cyan-400',     bgTo: 'to-teal-600',    soundUrl: 'https://www.soundjay.com/transportation/truck-horn-1.wav' },
];

const FUN_FACTS: Record<string, string> = {
  excavator:  '挖掘机的大手臂可以挖到地下好深好深！它挖土的速度比爸爸快100倍！',
  dump_truck: '自卸卡车的车厢可以像跷跷板一样翘起来，duang～duang～把沙子全倒掉！',
  crane:      '吊车的手臂可以伸得好长好长，比长颈鹿的脖子还要长！能吊起比派派重1000倍的东西！',
  mixer:      '搅拌车肚子里有一个大滚筒，一直在转呀转，这样混凝土就不会凝固啦！',
  bulldozer:  '推土机前面有一个大大的铲子，轻轻一推就把土堆夷为平地！像大嘴怪一样！',
  roller:     '压路机的大滚筒压过地面，坑坑洼洼就变得平平整整，像熨斗一样！',
  fire_truck: '消防车是救援英雄！它装着长长的梯子和水管，发生火灾时来帮忙！',
  tractor:    '突突突突！拖拉机跑得不太快，但力气特别大！农民伯伯最喜欢它！',
  forklift:   '叉车前面有两根尖尖的"筷子"，可以叉起大大的箱子！工厂里全靠它！',
  flatbed:    '平板运输车的车厢是平平的，专门运输挖掘机、推土机这些大家伙！',
};

export interface CollectionEntry {
  _recordId: string;
  truckId: string;
  seenCount: number;
  firstSeenDate: string;
  lastSeenDate: string;
  photoToken: string;
  notes: string;
}

export async function GET() {
  if (BITABLE_APP_TOKEN === 'TBD_CREATE_NEW' || !BITABLE_APP_TOKEN) {
    return NextResponse.json({ ok: true, entries: [], source: 'local' });
  }
  try {
    const data = await bitableRequest(
      'GET',
      `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records?page_size=100`
    ) as { data?: { items?: Array<{ record_id: string; fields: Record<string, unknown> }> } };
    const items = data?.data?.items || [];
    const entries: CollectionEntry[] = items.map((item) => ({
      _recordId: item.record_id,
      truckId: item.fields.truckId as string || '',
      seenCount: (item.fields.seenCount as number) || 0,
      firstSeenDate: item.fields.firstSeenDate as string || '',
      lastSeenDate: item.fields.lastSeenDate as string || '',
      photoToken: (item.fields.photoToken as string) || '',
      notes: (item.fields.notes as string) || '',
    }));
    return NextResponse.json({ ok: true, entries, source: 'bitable' });
  } catch (e) {
    return NextResponse.json({ ok: true, entries: [], source: 'local', error: String(e) });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
  }

  if (BITABLE_APP_TOKEN === 'TBD_CREATE_NEW' || !BITABLE_APP_TOKEN) {
    return NextResponse.json({ ok: true, message: 'local_mode' });
  }

  try {
    const { action, entry } = body as { action?: string; entry?: Record<string, unknown> };

    if (action === 'delete') {
      const recordId = body.recordId as string;
      if (recordId) {
        await bitableRequest('DELETE', `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${recordId}`);
      }
      return NextResponse.json({ ok: true });
    }

    if (!entry) return NextResponse.json({ ok: false, error: 'no entry' }, { status: 400 });

    const fields: Record<string, unknown> = {};
    if (entry.truckId) fields.truckId = entry.truckId;
    if (entry.seenCount !== undefined) fields.seenCount = entry.seenCount;
    if (entry.firstSeenDate) fields.firstSeenDate = entry.firstSeenDate;
    if (entry.lastSeenDate) fields.lastSeenDate = entry.lastSeenDate;
    if (entry.notes) fields.notes = entry.notes;
    if (entry.photoToken) fields.photoToken = entry.photoToken;

    if (entry._recordId) {
      await bitableRequest(
        'PUT',
        `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${entry._recordId}`,
        { fields }
      );
    } else {
      await bitableRequest(
        'POST',
        `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records`,
        { fields }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export function getFunFact(id: string): string {
  return FUN_FACTS[id] || '派派最喜欢工程车啦！';
}
