import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.FEISHU_APP_ID || 'cli_a934b5afcc5d5cd3';
const APP_SECRET = process.env.FEISHU_APP_SECRET || '3SoEuoKZbtNweBtt5O0aVdqYeilzLnqw';
const BITABLE_APP_TOKEN = process.env.FEISHU_SOUNDS_APP_TOKEN || 'TBD_CREATE_NEW';
const BITABLE_TABLE_ID = process.env.FEISHU_SOUNDS_TABLE_ID || 'TBD_CREATE_NEW';

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

export interface Sound {
  _recordId?: string;
  id: string;
  name: string;
  emoji: string;
  category: string; // 'vehicle' | 'animal' | 'nature'
  soundUrl: string;
  difficulty: number; // 1-3
  options: { emoji: string; text: string; correct: boolean }[];
  timesPlayed: number;
  correctCount: number;
}

const DEFAULT_SOUNDS: Sound[] = [
  // 🚗 交通工具
  {
    id: 'fire_truck',
    name: '消防车警笛',
    emoji: '🚒',
    category: 'vehicle',
    soundUrl: 'https://www.soundjay.com/transportation/fire-truck-horn.wav',
    difficulty: 1,
    options: [
      { emoji: '🚒', text: '消防车', correct: true },
      { emoji: '🚑', text: '救护车', correct: false },
      { emoji: '🚚', text: '卡车', correct: false },
      { emoji: '🚜', text: '拖拉机', correct: false },
    ],
    timesPlayed: 0,
    correctCount: 0,
  },
  {
    id: 'ambulance',
    name: '救护车警笛',
    emoji: '🚑',
    category: 'vehicle',
    soundUrl: 'https://www.soundjay.com/transportation/ambulance-01.wav',
    difficulty: 1,
    options: [
      { emoji: '🚑', text: '救护车', correct: true },
      { emoji: '🚒', text: '消防车', correct: false },
      { emoji: '🚓', text: '警车', correct: false },
      { emoji: '🚐', text: '面包车', correct: false },
    ],
    timesPlayed: 0,
    correctCount: 0,
  },
  {
    id: 'car_horn',
    name: '汽车喇叭',
    emoji: '🚗',
    category: 'vehicle',
    soundUrl: 'https://www.soundjay.com/transportation/car-horn-01.wav',
    difficulty: 1,
    options: [
      { emoji: '🚗', text: '汽车', correct: true },
      { emoji: '🚕', text: '出租车', correct: false },
      { emoji: '🚙', text: '吉普车', correct: false },
      { emoji: '🛻', text: '皮卡车', correct: false },
    ],
    timesPlayed: 0,
    correctCount: 0,
  },
  {
    id: 'dump_truck',
    name: '自卸卡车',
    emoji: '🚚',
    category: 'vehicle',
    soundUrl: 'https://www.soundjay.com/transportation/car-horn-02.wav',
    difficulty: 2,
    options: [
      { emoji: '🚚', text: '卡车', correct: true },
      { emoji: '🚛', text: '搅拌车', correct: false },
      { emoji: '🚜', text: '拖拉机', correct: false },
      { emoji: '🚗', text: '汽车', correct: false },
    ],
    timesPlayed: 0,
    correctCount: 0,
  },
  {
    id: 'tractor',
    name: '拖拉机突突突',
    emoji: '🚜',
    category: 'vehicle',
    soundUrl: 'https://www.soundjay.com/mechanical/engine-idle-1.wav',
    difficulty: 2,
    options: [
      { emoji: '🚜', text: '拖拉机', correct: true },
      { emoji: '🚚', text: '卡车', correct: false },
      { emoji: '🏗️', text: '吊车', correct: false },
      { emoji: '🚛', text: '搅拌车', correct: false },
    ],
    timesPlayed: 0,
    correctCount: 0,
  },
  // 🐾 动物叫声
  {
    id: 'dog',
    name: '小狗汪汪',
    emoji: '🐶',
    category: 'animal',
    soundUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Dog_barking.ogg',
    difficulty: 1,
    options: [
      { emoji: '🐶', text: '小狗', correct: true },
      { emoji: '🐱', text: '小猫', correct: false },
      { emoji: '🐷', text: '小猪', correct: false },
      { emoji: '🐻', text: '小熊', correct: false },
    ],
    timesPlayed: 0,
    correctCount: 0,
  },
  {
    id: 'cat',
    name: '小猫喵喵',
    emoji: '🐱',
    category: 'animal',
    soundUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Cat_meow_2.ogg',
    difficulty: 1,
    options: [
      { emoji: '🐱', text: '小猫', correct: true },
      { emoji: '🐶', text: '小狗', correct: false },
      { emoji: '🐰', text: '小兔子', correct: false },
      { emoji: '🐸', text: '小青蛙', correct: false },
    ],
    timesPlayed: 0,
    correctCount: 0,
  },
  {
    id: 'chicken',
    name: '小鸡叽叽',
    emoji: '🐔',
    category: 'animal',
    soundUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Chicken.ogg',
    difficulty: 1,
    options: [
      { emoji: '🐔', text: '小鸡', correct: true },
      { emoji: '🦆', text: '小鸭', correct: false },
      { emoji: '🐦', text: '小鸟', correct: false },
      { emoji: '🦅', text: '老鹰', correct: false },
    ],
    timesPlayed: 0,
    correctCount: 0,
  },
  {
    id: 'frog',
    name: '青蛙呱呱',
    emoji: '🐸',
    category: 'animal',
    soundUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Common_frog.ogg',
    difficulty: 2,
    options: [
      { emoji: '🐸', text: '青蛙', correct: true },
      { emoji: '🐔', text: '小鸡', correct: false },
      { emoji: '🐱', text: '小猫', correct: false },
      { emoji: '🦆', text: '小鸭', correct: false },
    ],
    timesPlayed: 0,
    correctCount: 0,
  },
  {
    id: 'pig',
    name: '小猪哼哼',
    emoji: '🐷',
    category: 'animal',
    soundUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Pig.ogg',
    difficulty: 2,
    options: [
      { emoji: '🐷', text: '小猪', correct: true },
      { emoji: '🐶', text: '小狗', correct: false },
      { emoji: '🐮', text: '小牛', correct: false },
      { emoji: '🐑', text: '小羊', correct: false },
    ],
    timesPlayed: 0,
    correctCount: 0,
  },
  // 🌈 自然声音
  {
    id: 'thunder',
    name: '打雷',
    emoji: '⛈️',
    category: 'nature',
    soundUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Thunder_rolling.ogg',
    difficulty: 1,
    options: [
      { emoji: '⛈️', text: '打雷', correct: true },
      { emoji: '🌧️', text: '下雨', correct: false },
      { emoji: '💨', text: '刮风', correct: false },
      { emoji: '🌊', text: '海浪', correct: false },
    ],
    timesPlayed: 0,
    correctCount: 0,
  },
  {
    id: 'rain',
    name: '下雨',
    emoji: '🌧️',
    category: 'nature',
    soundUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Rain_Sound.ogg',
    difficulty: 1,
    options: [
      { emoji: '🌧️', text: '下雨', correct: true },
      { emoji: '⛈️', text: '打雷', correct: false },
      { emoji: '❄️', text: '下雪', correct: false },
      { emoji: '💧', text: '滴水', correct: false },
    ],
    timesPlayed: 0,
    correctCount: 0,
  },
  {
    id: 'bell',
    name: '铃铛',
    emoji: '🔔',
    category: 'nature',
    soundUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Bell_ringing.ogg',
    difficulty: 1,
    options: [
      { emoji: '🔔', text: '铃铛', correct: true },
      { emoji: '🎵', text: '音乐', correct: false },
      { emoji: '📯', text: '号角', correct: false },
      { emoji: '🎹', text: '钢琴', correct: false },
    ],
    timesPlayed: 0,
    correctCount: 0,
  },
  {
    id: 'music_box',
    name: '音乐盒',
    emoji: '🎵',
    category: 'nature',
    soundUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Music_box_-_A_Tinkle.ogg',
    difficulty: 2,
    options: [
      { emoji: '🎵', text: '音乐盒', correct: true },
      { emoji: '🔔', text: '铃铛', correct: false },
      { emoji: '🎹', text: '钢琴', correct: false },
      { emoji: '📯', text: '号角', correct: false },
    ],
    timesPlayed: 0,
    correctCount: 0,
  },
  {
    id: 'trumpet',
    name: '号角',
    emoji: '📯',
    category: 'nature',
    soundUrl: 'https://www.soundjay.com/mechanical/mechanical-01.wav',
    difficulty: 2,
    options: [
      { emoji: '📯', text: '号角', correct: true },
      { emoji: '🔔', text: '铃铛', correct: false },
      { emoji: '🎵', text: '音乐盒', correct: false },
      { emoji: '🚒', text: '消防车', correct: false },
    ],
    timesPlayed: 0,
    correctCount: 0,
  },
];

export async function GET() {
  if (BITABLE_APP_TOKEN === 'TBD_CREATE_NEW' || !BITABLE_APP_TOKEN) {
    return NextResponse.json({ ok: true, sounds: DEFAULT_SOUNDS, source: 'default' });
  }
  try {
    const data = await bitableRequest(
      'GET',
      `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records?page_size=100`
    ) as { data?: { items?: Array<{ record_id: string; fields: Record<string, unknown> }> } };
    const items = data?.data?.items || [];

    const sounds = items.map((item) => ({
      _recordId: item.record_id,
      id: item.fields.id as string || '',
      name: item.fields.name as string || '',
      emoji: (item.fields.emoji as string) || '🔊',
      category: item.fields.category as string || 'vehicle',
      soundUrl: item.fields.soundUrl as string || '',
      difficulty: (item.fields.difficulty as number) || 1,
      options: (item.fields.options as Sound['options']) || [],
      timesPlayed: (item.fields.timesPlayed as number) || 0,
      correctCount: (item.fields.correctCount as number) || 0,
    }));

    return NextResponse.json({ ok: true, sounds, source: 'bitable' });
  } catch (e) {
    return NextResponse.json({ ok: true, sounds: DEFAULT_SOUNDS, source: 'default', error: String(e) });
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
    const sound = (body.sound || {}) as Record<string, unknown>;

    const fields: Record<string, unknown> = {};
    if (sound.id) fields.id = sound.id;
    if (sound.name) fields.name = sound.name;
    if (sound.emoji) fields.emoji = sound.emoji;
    if (sound.category) fields.category = sound.category;
    if (sound.soundUrl) fields.soundUrl = sound.soundUrl;
    if (sound.difficulty !== undefined) fields.difficulty = sound.difficulty;
    if (sound.options) fields.options = sound.options;
    if (sound.timesPlayed !== undefined) fields.timesPlayed = sound.timesPlayed;
    if (sound.correctCount !== undefined) fields.correctCount = sound.correctCount;

    if (sound._recordId) {
      await bitableRequest(
        'PUT',
        `/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records/${sound._recordId}`,
        { fields }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
