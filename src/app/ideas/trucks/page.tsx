'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { DEFAULT_TRUCKS, Truck } from '@/app/api/trucks/route';

const CATEGORY_LABELS: Record<string, string> = {
  excavator: '🚜 挖掘机', crane: '🏗️ 吊车', bulldozer: '🚜 推土机',
  dump_truck: '🚚 自卸卡车', mixer: '🚛 搅拌车', roller: '🔵 压路机',
  fire_truck: '🚒 消防车', tractor: '🚜 拖拉机', forklift: '🔧 叉车', flatbed: '🛻 平板车',
};

const CATEGORY_EMOJI: Record<string, string> = {
  excavator: '🚜', crane: '🏗️', bulldozer: '🚜',
  dump_truck: '🚚', mixer: '🚛', roller: '🔵',
  fire_truck: '🚒', tractor: '🚜', forklift: '🔧', flatbed: '🛻',
};

type Tab = 'explore' | 'favorites' | 'seen';

function HornButton({ soundUrl, color, size = 'normal' }: { soundUrl: string; color: string; size?: 'normal' | 'big' }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = () => {
    if (!soundUrl) return;
    setPlaying(true);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    setTimeout(() => setPlaying(false), 1500);
  };

  const big = size === 'big';
  return (
    <>
      {soundUrl && <audio ref={audioRef} src={soundUrl} preload="none" />}
      <button
        onClick={(e) => { e.stopPropagation(); play(); }}
        className={`flex items-center gap-1 rounded-full font-black transition-all active:scale-90 select-none
          ${big ? 'px-5 py-3 text-lg shadow-xl' : 'px-3 py-1.5 text-sm shadow-md'}
          ${playing ? 'animate-pulse scale-110' : 'hover:scale-105'}
        `}
        style={{
          backgroundColor: color,
          color: 'white',
        }}
      >
        {playing ? '🔊' : '📢'} 嘀嘀！
      </button>
    </>
  );
}

function TruckCard({
  truck, onSeen, onToggleFav, expanded, onExpand,
}: {
  truck: Truck;
  onSeen: () => void;
  onToggleFav: () => void;
  expanded: boolean;
  onExpand: () => void;
}) {
  const photoUrl = truck.photo ? `/api/photo?token=${encodeURIComponent(truck.photo)}` : '';

  return (
    <div
      className={`relative cursor-pointer transition-all duration-300 ${expanded ? 'col-span-2 row-span-2' : ''}`}
      onClick={onExpand}
    >
      <div
        className={`bg-gradient-to-br ${truck.bgFrom} ${truck.bgTo} rounded-3xl p-4 shadow-lg hover:shadow-2xl transition-all duration-200 relative overflow-hidden`}
      >
        {/* Favorite star */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
          className={`absolute top-2 right-2 z-10 text-2xl transition-transform active:scale-75 ${truck.isFavorite ? 'opacity-100' : 'opacity-30 hover:opacity-70'}`}
        >
          {truck.isFavorite ? '⭐' : '☆'}
        </button>

        {/* Seen badge */}
        {truck.seenCount > 0 && (
          <div
            className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-white/90 text-xs font-black flex items-center gap-1"
            style={{ color: truck.color }}
          >
            👀 {truck.seenCount}次
          </div>
        )}

        {/* Image area */}
        <div
          className="w-full rounded-2xl bg-black/15 overflow-hidden flex items-center justify-center mb-3"
          style={{ height: expanded ? '200px' : '120px' }}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={truck.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl" style={{ fontSize: expanded ? '80px' : '60px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>
              {truck.emoji}
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="text-white font-black text-lg text-center leading-tight mb-2 drop-shadow">
          {truck.name}
        </h3>

        {/* Horn button */}
        <div className="flex justify-center">
          <HornButton soundUrl={truck.soundUrl} color={truck.color} />
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white/20 rounded-xl p-3">
              <p className="text-white/90 text-sm leading-relaxed">💡 {truck.funFact}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onSeen(); }}
              className="w-full py-2.5 bg-white/25 hover:bg-white/40 text-white font-black rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              👀 我见过这个车车！
            </button>
          </div>
        )}

        {/* Decorative stripe */}
        <div className="absolute bottom-0 left-0 right-0 h-3 bg-white/10 rounded-b-3xl" />
      </div>
    </div>
  );
}

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<Truck[]>(DEFAULT_TRUCKS);
  const [tab, setTab] = useState<Tab>('explore');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundTest, setSoundTest] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/trucks')
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && json.trucks?.length > 0) {
          setTrucks(json.trucks as Truck[]);
          if (typeof localStorage !== 'undefined') {
            // 合并本地状态
            try {
              const saved = localStorage.getItem('paipai-trucks');
              if (saved) {
                const local: Record<string, { seenCount: number; isFavorite: boolean }> = JSON.parse(saved);
                setTrucks((prev) =>
                  prev.map((t) => ({
                    ...t,
                    seenCount: local[t.id]?.seenCount ?? t.seenCount,
                    isFavorite: local[t.id]?.isFavorite ?? t.isFavorite,
                  }))
                );
              }
            } catch {}
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveLocally = (updated: Truck[]) => {
    if (typeof localStorage === 'undefined') return;
    const state: Record<string, { seenCount: number; isFavorite: boolean }> = {};
    updated.forEach((t) => { state[t.id] = { seenCount: t.seenCount, isFavorite: t.isFavorite }; });
    localStorage.setItem('paipai-trucks', JSON.stringify(state));
  };

  const handleSeen = (id: string) => {
    setTrucks((prev) => {
      const updated = prev.map((t) => t.id === id ? { ...t, seenCount: t.seenCount + 1 } : t);
      saveLocally(updated);
      return updated;
    });
  };

  const handleToggleFav = (id: string) => {
    setTrucks((prev) => {
      const updated = prev.map((t) => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t);
      saveLocally(updated);
      return updated;
    });
  };

  const stats = {
    total: trucks.length,
    favorites: trucks.filter((t) => t.isFavorite).length,
    seen: trucks.filter((t) => t.seenCount > 0).length,
  };

  const displayed = tab === 'favorites'
    ? trucks.filter((t) => t.isFavorite)
    : tab === 'seen'
    ? trucks.filter((t) => t.seenCount > 0)
    : trucks;

  return (
    <div className="min-h-screen pb-16" style={{ background: 'linear-gradient(135deg, #fef9c3 0%, #fed7aa 50%, #fce7f3 100%)' }}>
      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <Link href="/" className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-900 text-sm font-bold transition-colors mb-3">
          ← 返回派派点子站
        </Link>

        <div className="text-center mb-4">
          <div className="text-6xl mb-1 drop-shadow-lg animate-bounce inline-block">🏗️</div>
          <h1 className="text-3xl font-black text-gray-800">派派工程车王国</h1>
          <p className="text-amber-600 font-medium text-sm mt-1">发现最酷的工程车！🚜</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: '全部车车', value: stats.total, icon: '🚜', color: 'bg-white', textColor: 'text-gray-700' },
            { label: '派派的最爱', value: stats.favorites, icon: '⭐', color: 'bg-amber-50', textColor: 'text-amber-700' },
            { label: '见过真车', value: stats.seen, icon: '👀', color: 'bg-emerald-50', textColor: 'text-emerald-700' },
          ].map(({ label, value, icon, color, textColor }) => (
            <div key={label} className={`${color} rounded-2xl p-3 text-center shadow-sm border border-white/50`}>
              <div className="text-2xl mb-0.5">{icon}</div>
              <div className={`text-2xl font-black ${textColor}`}>{value}</div>
              <div className={`text-xs ${textColor} opacity-70`}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {([
            { key: 'explore', label: '🔍 探索', icon: '🔍' },
            { key: 'favorites', label: '⭐ 最爱', icon: '⭐' },
            { key: 'seen', label: '👀 见过', icon: '👀' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2.5 rounded-2xl text-sm font-black transition-all ${
                tab === key
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'bg-white text-gray-500 shadow-sm border border-gray-100 hover:bg-amber-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-5xl animate-spin">🚜</div>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">
              {tab === 'favorites' ? '⭐' : tab === 'seen' ? '👀' : '🔍'}
            </div>
            <p className="text-xl font-black text-gray-400">
              {tab === 'favorites' ? '还没有最爱的车车' : tab === 'seen' ? '还没见过真的车车呢！' : '没有车车'}
            </p>
            <p className="text-sm text-gray-300 mt-2">
              {tab === 'seen' ? '去工地附近找找看吧～🚜' : '点点小爱心收藏喜欢的车车吧！'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-8">
            {displayed.map((truck) => (
              <TruckCard
                key={truck.id}
                truck={truck}
                onSeen={() => handleSeen(truck.id)}
                onToggleFav={() => handleToggleFav(truck.id)}
                expanded={expandedId === truck.id}
                onExpand={() => setExpandedId(expandedId === truck.id ? null : truck.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fun banner */}
      <div className="max-w-5xl mx-auto px-4 mb-6">
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-3xl p-4 text-center shadow-xl">
          <p className="text-white font-black text-lg">🚜 派派最喜欢的工程车是什么？告诉爸爸吧！</p>
        </div>
      </div>
    </div>
  );
}
