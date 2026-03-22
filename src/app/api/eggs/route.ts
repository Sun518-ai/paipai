import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';
const BITABLE_APP_TOKEN = process.env.FEISHU_EGGS_APP_TOKEN || 'TBD_CREATE_NEW';
const BITABLE_TABLE_ID = process.env.FEISHU_EGGS_TABLE_ID || 'TBD_CREATE_NEW';

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

export interface Animal {
  _recordId?: string;
  name: string;
  emoji: string;
  type: string;
  rarity: string;
  funFact: string;
  seenCount: number;
  isFavorite: boolean;
}

export const DEFAULT_ANIMALS: Animal[] = [
  { name: '小鸡', emoji: '🐔', type: '鸟类', rarity: 'common', funFact: '小鸡刚出生就会走路和吃东西，好厉害！', seenCount: 0, isFavorite: false },
  { name: '小鸭', emoji: '🦆', type: '鸟类', rarity: 'common', funFact: '小鸭子是游泳高手，一出生就会在水里划水！', seenCount: 0, isFavorite: false },
  { name: '小狗', emoji: '🐶', type: '哺乳类', rarity: 'common', funFact: '小狗的鼻子超灵敏，能闻到很远很远的气味！', seenCount: 0, isFavorite: false },
  { name: '小猫', emoji: '🐱', type: '哺乳类', rarity: 'common', funFact: '小猫晚上看得超清楚，是抓老鼠的小能手！', seenCount: 0, isFavorite: false },
  { name: '小兔', emoji: '🐰', type: '哺乳类', rarity: 'uncommon', funFact: '小兔子最爱吃胡萝卜，蹦蹦跳跳跑得超快！', seenCount: 0, isFavorite: false },
  { name: '小猪', emoji: '🐷', type: '哺乳类', rarity: 'common', funFact: '小猪其实很聪明，它们喜欢在泥巴里打滚来凉快！', seenCount: 0, isFavorite: false },
  { name: '小牛', emoji: '🐮', type: '哺乳类', rarity: 'common', funFact: '小牛小时候叫牛犊，它们每天要喝很多很多奶！', seenCount: 0, isFavorite: false },
  { name: '小羊', emoji: '🐑', type: '哺乳类', rarity: 'uncommon', funFact: '小羊咩咩叫，它们身上的毛可以做暖暖的毛衣！', seenCount: 0, isFavorite: false },
  { name: '小马', emoji: '🐴', type: '哺乳类', rarity: 'uncommon', funFact: '小马生下来几分钟就能站起来走路，好棒！', seenCount: 0, isFavorite: false },
  { name: '小象', emoji: '🐘', type: '哺乳类', rarity: 'rare', funFact: '小象用长鼻子吸水喝、洗澡，还能帮妈妈洗澡呢！', seenCount: 0, isFavorite: false },
  { name: '小狮', emoji: '🦁', type: '哺乳类', rarity: 'rare', funFact: '小狮子是森林之王，它们喜欢一起玩耍和打滚！', seenCount: 0, isFavorite: false },
  { name: '小龙', emoji: '🐲', type: '神话', rarity: 'legendary', funFact: '龙是超级厉害的传说动物，会飞会喷火，好酷！', seenCount: 0, isFavorite: false },
];

export async function GET() {
  if (BITABLE_APP_TOKEN === 'TBD_CREATE_NEW' || !BITABLE_APP_TOKEN) {
    return NextResponse.json({ ok: true, animals: DEFAULT_ANIMALS, source: 'default' });
  }
  try {
    const data = await bitableRequest(
      'GET',
      `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records?page_size=100`
    ) as { data?: { items?: Array<{ record_id: string; fields: Record<string, unknown> }> } };
    const items = data?.data?.items || [];

    const animals = items.map((item) => ({
      _recordId: item.record_id,
      name: item.fields.name as string || '',
      emoji: (item.fields.emoji as string) || '🐣',
      type: item.fields.type as string || '动物',
      rarity: (item.fields.rarity as string) || 'common',
      funFact: item.fields.funFact as string || '',
      seenCount: (item.fields.seenCount as number) || 0,
      isFavorite: Boolean(item.fields.isFavorite),
    }));

    return NextResponse.json({ ok: true, animals, source: 'bitable' });
  } catch (e) {
    return NextResponse.json({ ok: true, animals: DEFAULT_ANIMALS, source: 'default', error: String(e) });
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
    const animal = (body.animal || {}) as Record<string, unknown>;
    const RARITY_MAP: Record<string, string> = {
      common: '普通', uncommon: '稀有', rare: '珍稀', legendary: '传说',
    };

    const fields: Record<string, unknown> = {};
    if (animal.name) fields.name = animal.name;
    if (animal.emoji) fields.emoji = animal.emoji;
    if (animal.type) fields.type = animal.type;
    if (animal.rarity) fields.rarity = RARITY_MAP[animal.rarity as string] || animal.rarity;
    if (animal.funFact) fields.funFact = animal.funFact;
    if (animal.seenCount !== undefined) fields.seenCount = animal.seenCount;
    if (animal.isFavorite !== undefined) fields.isFavorite = animal.isFavorite;

    if (animal._recordId) {
      await bitableRequest(
        'PUT',
        `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${animal._recordId}`,
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
