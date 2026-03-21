'use client';

import { useState, useEffect, useRef } from 'react';
import { loadHybrid, saveHybrid } from '@/lib/feishuStore';
import Link from 'next/link';

type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
type BugType = '甲虫' | '蝴蝶' | '蜻蜓' | '蚂蚁' | '蜜蜂' | '螳螂' | '蝉' | '萤火虫' | '其他';

interface Insect {
  id: string;
  name: string;
  type: BugType;
  rarity: Rarity;
  description: string;
  location: string;
  dateFound: string;
  photo: string; // data URL or /insects/ path
  stars: number; // 1-3 for rarity
  notes: string;
}

const RARITY_CONFIG: Record<Rarity, { label: string; color: string; bg: string; glow: string; stars: number }> = {
  common:    { label: '普通',     color: '#6b7280', bg: 'from-gray-400 to-gray-500',   glow: 'shadow-gray-400',   stars: 1 },
  uncommon:  { label: '稀有',     color: '#16a34a', bg: 'from-green-500 to-emerald-600', glow: 'shadow-green-400',   stars: 2 },
  rare:      { label: '珍稀',     color: '#2563eb', bg: 'from-blue-500 to-indigo-600',  glow: 'shadow-blue-400',   stars: 3 },
  legendary: { label: '传说',     color: '#f59e0b', bg: 'from-amber-400 to-orange-500', glow: 'shadow-amber-400',  stars: 3 },
};

const TYPE_COLORS: Record<BugType, string> = {
  '甲虫':    'bg-amber-100 text-amber-700',
  '蝴蝶':    'bg-pink-100 text-pink-700',
  '蜻蜓':    'bg-sky-100 text-sky-700',
  '蚂蚁':    'bg-orange-100 text-orange-700',
  '蜜蜂':    'bg-yellow-100 text-yellow-700',
  '螳螂':    'bg-green-100 text-green-700',
  '蝉':      'bg-teal-100 text-teal-700',
  '萤火虫':  'bg-lime-100 text-lime-700',
  '其他':    'bg-gray-100 text-gray-600',
};

const DEFAULT_INSECTS: Insect[] = [
  {
    id: 'demo1',
    name: '七星瓢虫',
    type: '甲虫',
    rarity: 'uncommon',
    description: '红色翅膀上有七个黑色斑点，是农民的好帮手！',
    location: '花园',
    dateFound: '2026-03-21',
    photo: '',
    stars: 2,
    notes: '派派在花园里发现的小家伙！',
  },
];

function InsectCard({ insect, onClick }: { insect: Insect; onClick: () => void }) {
  const cfg = RARITY_CONFIG[insect.rarity];
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative cursor-pointer perspective-1000 w-full"
      onClick={() => { setFlipped(!flipped); setTimeout(onClick, 300); }}
    >
      <div className={`relative transition-all duration-500 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}>
        {/* Front - Card */}
        <div
          className={`relative bg-gradient-to-br ${cfg.bg} rounded-2xl p-3 pb-2 shadow-lg ${cfg.glow} hover:scale-105 transition-transform duration-200`}
          style={{ minHeight: '200px' }}
        >
          {/* Stars */}
          <div className="flex justify-end mb-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={`text-sm ${i < cfg.stars ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
            ))}
          </div>

          {/* Photo area */}
          <div
            className="w-full rounded-xl bg-black/20 backdrop-blur-sm overflow-hidden flex items-center justify-center mb-2"
            style={{ height: '100px' }}
          >
            {insect.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={insect.photo}
                alt={insect.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-4xl opacity-40">🐛</div>
            )}
          </div>

          {/* Rarity badge */}
          <div
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-white text-xs font-bold"
            style={{ backgroundColor: cfg.color }}
          >
            {cfg.label}
          </div>

          {/* Name */}
          <h3 className="text-white font-black text-base text-center leading-tight">
            {insect.name}
          </h3>

          {/* Type */}
          <div className="flex justify-center mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[insect.type]}`}>
              {insect.type}
            </span>
          </div>

          {/* Card bottom decoration */}
          <div className="absolute bottom-0 left-0 right-0 h-3 bg-black/10 rounded-b-2xl" />
          <div className="absolute bottom-1 left-0 right-0 flex justify-center">
            <div className="w-6 h-1 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InsectsPage() {
  const [insects, setInsects] = useState<Insect[]>(DEFAULT_INSECTS);

  useEffect(() => {
    loadHybrid<Insect[]>('paipai-insects', DEFAULT_INSECTS).then((data) => {
      if (data.length > 0) setInsects(data);
    });
  }, []);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedInsect, setSelectedInsect] = useState<Insect | null>(null);
  const [form, setForm] = useState<Partial<Insect>>({
    name: '', type: '甲虫', rarity: 'common', description: '',
    location: '', dateFound: new Date().toISOString().split('T')[0],
    photo: '', stars: 1, notes: '',
  });
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState<BugType | '全部'>('全部');
  const [filterRarity, setFilterRarity] = useState<Rarity | '全部'>('全部');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (insects.length > 0) {
      saveHybrid('paipai-insects', insects);
    }
  }, [insects]);

  const rarityMap: Record<string, number> = { common: 1, uncommon: 2, rare: 3, legendary: 3 };
  const filtered = insects.filter((i) => {
    if (filterType !== '全部' && i.type !== filterType) return false;
    if (filterRarity !== '全部' && i.rarity !== filterRarity) return false;
    return true;
  });

  const stats = {
    total: insects.length,
    caught: insects.filter((i) => i.photo).length,
    rare: insects.filter((i) => i.rarity === 'legendary').length,
    types: new Set(insects.map((i) => i.type)).size,
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((f) => ({ ...f, photo: ev.target?.result as string }));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = () => {
    if (!form.name?.trim()) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const newInsect: Insect = {
      id,
      name: form.name!,
      type: (form.type as BugType) || '其他',
      rarity: (form.rarity as Rarity) || 'common',
      description: form.description || '',
      location: form.location || '',
      dateFound: form.dateFound || new Date().toISOString().split('T')[0],
      photo: form.photo || '',
      stars: rarityMap[form.rarity || 'common'] || 1,
      notes: form.notes || '',
    };
    setInsects((prev) => [...prev, newInsect]);
    setForm({ name: '', type: '甲虫', rarity: 'common', description: '', location: '', dateFound: new Date().toISOString().split('T')[0], photo: '', stars: 1, notes: '' });
    setShowAdd(false);
  };

  const deleteInsect = (id: string) => {
    setInsects((prev) => prev.filter((i) => i.id !== id));
    setSelectedInsect(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 pb-16">
      {/* Back */}
      <div className="max-w-5xl mx-auto px-6 pt-8">
        <Link href="/" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-800 text-sm font-medium transition-colors">
          ← 返回点子站
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl block mb-2">🐛</span>
          <h1 className="text-3xl font-black text-gray-800">派派昆虫百科</h1>
          <p className="text-gray-400 mt-1">发现 · 收集 · 记录每一种小虫子</p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: '已收录', value: stats.total, icon: '📖', color: 'bg-white' },
            { label: '已拍照', value: stats.caught, icon: '📷', color: 'bg-white' },
            { label: '传说虫', value: stats.rare, icon: '🌟', color: 'bg-amber-50' },
            { label: '种类数', value: stats.types, icon: '🔢', color: 'bg-white' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className={`${color} rounded-2xl p-3 text-center shadow-sm border border-gray-100`}>
              <div className="text-2xl mb-0.5">{icon}</div>
              <div className="text-2xl font-black text-gray-800">{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-sm text-gray-500 mr-1">类型：</span>
          {(['全部', '甲虫', '蝴蝶', '蜻蜓', '蚂蚁', '蜜蜂', '螳螂', '蝉', '萤火虫', '其他'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t as BugType | '全部')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                filterType === t
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300'
              }`}
            >
              {t}
            </button>
          ))}
          <div className="h-4 w-px bg-gray-200 mx-2" />
          <span className="text-sm text-gray-500">稀有度：</span>
          {(['全部', 'common', 'uncommon', 'rare', 'legendary'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRarity(r as Rarity | '全部')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                filterRarity === r
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300'
              }`}
            >
              {r === '全部' ? '全部' : RARITY_CONFIG[r as Rarity].label}
            </button>
          ))}
        </div>

        {/* Add button */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-400">
            找到 {filtered.length} 种小虫子
          </p>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm font-bold shadow-lg transition-all flex items-center gap-2"
          >
            {showAdd ? '✕ 取消' : '➕ 记录新昆虫'}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 mb-6 shadow-sm">
            <h3 className="font-black text-gray-800 mb-4">📓 记录新昆虫</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 font-medium">名字 *</label>
                <input
                  value={form.name || ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="比如：七星瓢虫"
                  className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">类型</label>
                <select
                  value={form.type || '甲虫'}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as BugType }))}
                  className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  {Object.entries(TYPE_COLORS).map(([t]) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">稀有度</label>
                <select
                  value={form.rarity || 'common'}
                  onChange={(e) => setForm((f) => ({ ...f, rarity: e.target.value as Rarity, stars: rarityMap[e.target.value] }))}
                  className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  {Object.entries(RARITY_CONFIG).map(([r, cfg]) => (
                    <option key={r} value={r}>{cfg.label} ({cfg.stars}⭐)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">发现地点</label>
                <input
                  value={form.location || ''}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="比如：公园草丛"
                  className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500 font-medium">描述</label>
                <input
                  value={form.description || ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="简单描述一下这个昆虫的特点..."
                  className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500 font-medium">派派笔记</label>
                <input
                  value={form.notes || ''}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="派派对这个昆虫有什么特别的想法..."
                  className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500 font-medium">照片</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  
                  onChange={handlePhoto}
                  className="hidden"
                />
                <div
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 border-2 border-dashed border-emerald-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
                >
                  {form.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.photo} alt="preview" className="w-full max-h-40 object-contain rounded-lg" />
                  ) : (
                    <>
                      <span className="text-3xl mb-2">{uploading ? '⏳' : '📷'}</span>
                      <p className="text-sm text-emerald-600 font-medium">
                        {uploading ? '上传中...' : '点击拍照或上传照片'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleAdd}
              disabled={!form.name?.trim()}
              className="mt-5 w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold rounded-xl transition-colors shadow"
            >
              🌟 收入昆虫百科
            </button>
          </div>
        )}

        {/* Cards grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-300">
            <span className="text-6xl block mb-4">🔍</span>
            <p className="text-xl font-medium">还没有符合条件的小虫子</p>
            <p className="text-sm mt-1">去户外找找吧！🐛</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((insect) => (
              <div
                key={insect.id}
                onClick={() => setSelectedInsect(insect)}
                className="cursor-pointer"
              >
                <InsectCard insect={insect} onClick={() => setSelectedInsect(insect)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedInsect && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedInsect(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const cfg = RARITY_CONFIG[selectedInsect.rarity];
              return (
                <>
                  <div className={`relative bg-gradient-to-br ${cfg.bg} rounded-2xl p-6 text-white mb-4`}>
                    <div className="flex justify-end">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <span key={i} className={`text-lg ${i < cfg.stars ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
                      ))}
                    </div>
                    <div className="w-full rounded-xl bg-black/20 overflow-hidden flex items-center justify-center mb-3" style={{ height: '180px' }}>
                      {selectedInsect.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selectedInsect.photo} alt={selectedInsect.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-7xl opacity-30">🐛</span>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2" style={{ backgroundColor: cfg.color }}>
                        {cfg.label}
                      </div>
                      <h2 className="text-2xl font-black">{selectedInsect.name}</h2>
                      <div className="flex justify-center gap-2 mt-1">
                        <span className={`text-xs px-3 py-0.5 rounded-full ${TYPE_COLORS[selectedInsect.type]}`}>
                          {selectedInsect.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    {selectedInsect.description && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-gray-500 text-xs mb-1">📝 描述</p>
                        <p className="text-gray-700">{selectedInsect.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-gray-500 text-xs mb-1">📍 发现地点</p>
                        <p className="text-gray-700 font-medium">{selectedInsect.location || '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-gray-500 text-xs mb-1">📅 发现日期</p>
                        <p className="text-gray-700 font-medium">{selectedInsect.dateFound}</p>
                      </div>
                    </div>
                    {selectedInsect.notes && (
                      <div className="bg-amber-50 rounded-xl p-3">
                        <p className="text-amber-600 text-xs mb-1">💬 派派笔记</p>
                        <p className="text-amber-800">{selectedInsect.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => { deleteInsect(selectedInsect.id); setSelectedInsect(null); }}
                      className="flex-1 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      🗑️ 删除
                    </button>
                    <button
                      onClick={() => setSelectedInsect(null)}
                      className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      关闭
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
