import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';
const BITABLE_APP_TOKEN = process.env.FEISHU_TRUCK_APP_TOKEN || 'TBD_CREATE_NEW';
const BITABLE_TABLE_ID = process.env.FEISHU_TRUCK_TABLE_ID || 'TBD_CREATE_NEW';

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

export interface Truck {
  _recordId?: string;
  id: string;
  name: string;
  category: string;
  emoji: string;
  funFact: string;
  color: string;
  bgFrom: string;
  bgTo: string;
  photo: string;
  seenCount: number;
  isFavorite: boolean;
  soundUrl: string;
}

const CATEGORY_MAP: Record<string, string> = {
  excavator: '挖掘机', crane: '吊车', bulldozer: '推土机',
  dump_truck: '自卸卡车', mixer: '搅拌车', roller: '压路机',
  fire_truck: '消防车', tractor: '拖拉机', forklift: '叉车', flatbed: '平板车',
};

export async function GET() {
  // 如果没配置飞书多维表格，返回默认数据
  if (BITABLE_APP_TOKEN === 'TBD_CREATE_NEW' || !BITABLE_APP_TOKEN) {
    return NextResponse.json({ ok: true, trucks: DEFAULT_TRUCKS, source: 'default' });
  }
  try {
    const data = await bitableRequest(
      'GET',
      `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records?page_size=100`
    ) as { data?: { items?: Array<{ record_id: string; fields: Record<string, unknown> }> } };
    const items = data?.data?.items || [];

    const trucks = items.map((item) => ({
      _recordId: item.record_id,
      id: item.fields.name as string || '',
      name: item.fields.name as string || '',
      category: item.fields.category as string || '其他',
      emoji: (item.fields.emoji as string) || '🚜',
      funFact: item.fields.funFact as string || '',
      color: item.fields.color as string || '#f59e0b',
      bgFrom: item.fields.bgFrom as string || 'from-amber-400',
      bgTo: item.fields.bgTo as string || 'to-orange-500',
      photo: (item.fields.photoToken as string) || '',
      seenCount: (item.fields.seenCount as number) || 0,
      isFavorite: Boolean(item.fields.isFavorite),
      soundUrl: item.fields.soundUrl as string || '',
    }));

    return NextResponse.json({ ok: true, trucks, source: 'bitable' });
  } catch (e) {
    // Fallback to defaults
    return NextResponse.json({ ok: true, trucks: DEFAULT_TRUCKS, source: 'default', error: String(e) });
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
    // 本地模式不支持写入，返回成功
    return NextResponse.json({ ok: true, message: 'local_mode' });
  }

  try {
    const truck = (body.truck || {}) as Record<string, unknown>;

    const fields: Record<string, unknown> = {};
    if (truck.name) fields.name = truck.name;
    if (truck.category) fields.category = CATEGORY_MAP[truck.category as string] || truck.category;
    if (truck.emoji) fields.emoji = truck.emoji;
    if (truck.funFact) fields.funFact = truck.funFact;
    if (truck.color) fields.color = truck.color;
    if (truck.bgFrom) fields.bgFrom = truck.bgFrom;
    if (truck.bgTo) fields.bgTo = truck.bgTo;
    if (truck.soundUrl) fields.soundUrl = truck.soundUrl;
    if (truck.seenCount !== undefined) fields.seenCount = truck.seenCount;
    if (truck.isFavorite !== undefined) fields.isFavorite = truck.isFavorite;
    const photo = truck.photo as string;
    if (photo) fields.photoToken = photo;

    if (truck._recordId) {
      await bitableRequest(
        'PUT',
        `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${truck._recordId}`,
        { fields }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export const DEFAULT_TRUCKS: Truck[] = [
  {
    id: 'excavator', name: '挖掘机', category: 'excavator', emoji: '🚜',
    funFact: '挖掘机的大手臂可以挖到地下好深好深！它挖土的速度比爸爸铲土快100倍！',
    color: '#f59e0b', bgFrom: 'from-amber-400', bgTo: 'to-orange-500',
    photo: '', seenCount: 0, isFavorite: false,
    soundUrl: 'https://www.soundjay.com/transportation/car-horn-01.wav',
  },
  {
    id: 'dump_truck', name: '自卸卡车', category: 'dump_truck', emoji: '🚚',
    funFact: '自卸卡车的车厢可以像跷跷板一样翘起来！duang～duang～把沙子石头全倒掉！',
    color: '#f97316', bgFrom: 'from-orange-400', bgTo: 'to-red-500',
    photo: '', seenCount: 0, isFavorite: false,
    soundUrl: 'https://www.soundjay.com/transportation/car-horn-02.wav',
  },
  {
    id: 'crane', name: '吊车', category: 'crane', emoji: '🏗️',
    funFact: '吊车的手臂可以伸得好长好长，比长颈鹿的脖子还要长！它能吊起比派派重1000倍的东西！',
    color: '#64748b', bgFrom: 'from-slate-400', bgTo: 'to-slate-600',
    photo: '', seenCount: 0, isFavorite: false,
    soundUrl: 'https://www.soundjay.com/mechanical/mechanical-01.wav',
  },
  {
    id: 'mixer', name: '混凝土搅拌车', category: 'mixer', emoji: '🚛',
    funFact: '搅拌车肚子里有一个大滚筒，一直在转呀转，这样混凝土就不会凝固啦！',
    color: '#ef4444', bgFrom: 'from-red-400', bgTo: 'to-rose-600',
    photo: '', seenCount: 0, isFavorite: false,
    soundUrl: 'https://www.soundjay.com/mechanical/mechanical-02.wav',
  },
  {
    id: 'bulldozer', name: '推土机', category: 'bulldozer', emoji: '🚜',
    funFact: '推土机前面有一个大大的铲子，轻轻一推就把土堆夷为平地！像大嘴怪一样吃土！',
    color: '#eab308', bgFrom: 'from-yellow-400', bgTo: 'to-amber-500',
    photo: '', seenCount: 0, isFavorite: false,
    soundUrl: 'https://www.soundjay.com/mechanical/crunch-1.wav',
  },
  {
    id: 'roller', name: '压路机', category: 'roller', emoji: '🔵',
    funFact: '压路机的大滚筒压过地面，坑坑洼洼的地面就变得平平整整啦！像熨斗一样！',
    color: '#3b82f6', bgFrom: 'from-blue-400', bgTo: 'to-indigo-500',
    photo: '', seenCount: 0, isFavorite: false,
    soundUrl: 'https://www.soundjay.com/mechanical/vibration-1.wav',
  },
  {
    id: 'fire_truck', name: '消防车', category: 'fire_truck', emoji: '🚒',
    funFact: '消防车是救援英雄！它装着长长的梯子和水管，发生火灾时开着警笛来帮忙！',
    color: '#dc2626', bgFrom: 'from-red-500', bgTo: 'to-red-700',
    photo: '', seenCount: 0, isFavorite: false,
    soundUrl: 'https://www.soundjay.com/transportation/fire-truck-horn.wav',
  },
  {
    id: 'tractor', name: '拖拉机', category: 'tractor', emoji: '🚜',
    funFact: '突突突突！拖拉机跑得不太快，但力气特别大！农民伯伯最喜欢用它干活！',
    color: '#22c55e', bgFrom: 'from-green-400', bgTo: 'to-emerald-600',
    photo: '', seenCount: 0, isFavorite: false,
    soundUrl: 'https://www.soundjay.com/mechanical/engine-idle-1.wav',
  },
  {
    id: 'forklift', name: '叉车', category: 'forklift', emoji: '🔧',
    funFact: '叉车前面有两根尖尖的"筷子"，可以叉起大大的箱子！工厂里全靠它搬东西！',
    color: '#8b5cf6', bgFrom: 'from-violet-400', bgTo: 'to-purple-600',
    photo: '', seenCount: 0, isFavorite: false,
    soundUrl: 'https://www.soundjay.com/mechanical/forklift-1.wav',
  },
  {
    id: 'flatbed', name: '平板运输车', category: 'flatbed', emoji: '🛻',
    funFact: '平板运输车的车厢是平平的，专门运输挖掘机、推土机这些大家伙！它们是工程车的好朋友！',
    color: '#06b6d4', bgFrom: 'from-cyan-400', bgTo: 'to-teal-600',
    photo: '', seenCount: 0, isFavorite: false,
    soundUrl: 'https://www.soundjay.com/transportation/truck-horn-1.wav',
  },
];
