'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { BASE_TRUCKS, getFunFact } from '@/app/api/collection/route';

interface CollectionEntry {
  _recordId?: string;
  truckId: string;
  seenCount: number;
  firstSeenDate: string;
  lastSeenDate: string;
  photoToken: string;
  notes: string;
}

type Tab = 'cards' | 'album';

function Confetti() {
  const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899', '#f97316'];
  const pieces = Array.from({ length: 60 });
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((_, i) => {
        const c = colors[i % colors.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 2 + Math.random() * 2;
        const size = 6 + Math.random() * 8;
        const isCircle = Math.random() > 0.5;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: '-20px',
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: c,
              borderRadius: isCircle ? '50%' : '2px',
              animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function HornButton({ soundUrl, color }: { soundUrl: string; color: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const play = () => {
    if (!soundUrl) return;
    setPlaying(true);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    setTimeout(() => setPlaying(false), 2000);
  };
  return (
    <>
      {soundUrl && <audio ref={audioRef} src={soundUrl} preload="none" />}
      <button
        onClick={(e) => { e.stopPropagation(); play(); }}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-black text-sm transition-all active:scale-90 select-none shadow-lg hover:scale-105 ${playing ? 'animate-pulse scale-110' : ''}`}
        style={{ backgroundColor: color, color: 'white' }}
      >
        {playing ? '🔊' : '📢'} 嘀嘀！
      </button>
    </>
  );
}

function CardBack({ index, total }: { index: number; total: number }) {
  return (
    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-400 to-red-400 flex flex-col items-center justify-center shadow-2xl"
      style={{ backfaceVisibility: 'hidden' }}>
      <div className="text-6xl mb-3 animate-bounce">🎁</div>
      <p className="text-white font-black text-lg text-center px-4 drop-shadow">
        点击翻开<br />看看是什么车车！
      </p>
      <div className="absolute bottom-4 text-white/60 text-xs font-medium">
        {index + 1} / {total}
      </div>
      {/* Star pattern */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl opacity-10">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="absolute text-white text-xl"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, transform: 'scale(0.6)' }}>⭐</span>
        ))}
      </div>
    </div>
  );
}

function TruckCardFront({ truck, entry, onCollect, index, total }: {
  truck: typeof BASE_TRUCKS[0];
  entry?: CollectionEntry;
  onCollect: () => void;
  index: number;
  total: number;
}) {
  const [flipped, setFlipped] = useState(false);
  const photoUrl = entry?.photoToken ? `/api/photo?token=${encodeURIComponent(entry.photoToken)}` : '';
  const hasCollected = entry && entry.seenCount > 0;

  return (
    <div className="relative" style={{ perspective: '800px' }}>
      <div
        className="relative cursor-pointer transition-transform duration-500"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        onClick={() => setFlipped(!flipped)}
      >
        {/* Front (back of card) */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-400 via-orange-400 to-red-400 flex flex-col items-center justify-center shadow-2xl overflow-hidden"
          style={{ width: '100%', aspectRatio: '3/4' }}>
          <div className="text-6xl mb-3 animate-bounce">🎁</div>
          <p className="text-white font-black text-base text-center px-4 drop-shadow leading-relaxed">
            点击翻开<br />看看是什么车车！
          </p>
          <div className="absolute bottom-4 text-white/60 text-xs font-medium">
            {index + 1} / {total}
          </div>
          <div className="absolute inset-0 overflow-hidden rounded-3xl opacity-10">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="absolute text-white text-lg"
                style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, transform: 'scale(0.6)' }}>⭐</span>
            ))}
          </div>
        </div>

        {/* Back (truck info) */}
        <div
          className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: `linear-gradient(135deg, ${truck.color}22, ${truck.color}44)` }}
        >
          {/* Top stripe with emoji */}
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-4 pb-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-4xl drop-shadow-lg">{truck.emoji}</span>
              </div>
              {hasCollected && (
                <div className="flex items-center gap-1 bg-white/30 rounded-full px-2 py-0.5">
                  <span className="text-yellow-200 text-sm">⭐</span>
                  <span className="text-white text-xs font-black">已收集</span>
                </div>
              )}
            </div>
            <h3 className="text-white font-black text-xl text-center mt-2 drop-shadow-lg">{truck.name}</h3>
            <div className="flex justify-center mt-1">
              <span className="text-xs text-white/80 bg-white/20 px-2 py-0.5 rounded-full">{truck.category}</span>
            </div>
          </div>

          {/* Photo / emoji area */}
          <div
            className="bg-black/10 overflow-hidden flex items-center justify-center mx-3 mt-3 rounded-2xl"
            style={{ height: '120px' }}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={truck.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span className="text-6xl opacity-60">{truck.emoji}</span>
            )}
          </div>

          {/* Fun fact */}
          <div className="mx-3 mt-2 bg-white/60 rounded-xl p-2.5">
            <p className="text-gray-700 text-xs leading-relaxed font-medium">💡 {getFunFact(truck.id)}</p>
          </div>

          {/* Stats row */}
          {entry && entry.seenCount > 0 && (
            <div className="mx-3 mt-2 flex justify-between text-xs text-gray-600">
              <span>👀 见过 {entry.seenCount} 次</span>
              <span>📅 {entry.lastSeenDate || entry.firstSeenDate}</span>
            </div>
          )}

          {/* Horn */}
          <div className="mx-3 mt-auto pt-2 pb-3 flex justify-center" onClick={(e) => e.stopPropagation()}>
            <HornButton soundUrl={truck.soundUrl} color={truck.color} />
          </div>

          {/* Collect button */}
          <div className="mx-3 mb-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onCollect}
              className={`w-full py-2.5 rounded-xl font-black text-sm transition-all active:scale-95 shadow-md ${hasCollected ? 'bg-emerald-400 text-white hover:bg-emerald-500' : 'bg-white text-orange-600 hover:bg-orange-50'}`}
            >
              {hasCollected ? `⭐ 已见过 ${entry!.seenCount} 次！再记一次！` : '👀 派派见过这个车车！'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectModal({ truck, onClose, onConfirm }: {
  truck: typeof BASE_TRUCKS[0];
  onClose: () => void;
  onConfirm: (notes: string, photoToken: string) => void;
}) {
  const [notes, setNotes] = useState('');
  const [photoToken, setPhotoToken] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) return;
      const json = await res.json();
      if (json.fileToken) setPhotoToken(json.fileToken as string);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <span className="text-5xl block mb-2">{truck.emoji}</span>
          <h3 className="text-xl font-black text-gray-800">我见过 {truck.name} 啦！🎉</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">📝 派派想说...</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="在哪里看到的？什么颜色的？"
              rows={2}
              className="w-full mt-1 px-4 py-2.5 border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium">📷 拍照（可选）</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            <div
              onClick={() => fileRef.current?.click()}
              className="mt-1 border-2 border-dashed border-orange-200 rounded-xl p-4 flex flex-col items-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-all"
            >
              {photoToken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/photo?token=${encodeURIComponent(photoToken)}`} alt="preview" className="w-full h-24 object-contain rounded-lg" />
              ) : (
                <>
                  <span className="text-2xl mb-1">{uploading ? '⏳' : '📷'}</span>
                  <p className="text-xs text-orange-500 font-medium">{uploading ? '上传中...' : '点击拍照或选照片'}</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
            取消
          </button>
          <button onClick={() => onConfirm(notes, photoToken)}
            className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-black rounded-xl text-sm shadow-lg hover:shadow-xl transition-all active:scale-95">
            🎉 记录下来！
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CollectionPage() {
  const [entries, setEntries] = useState<Record<string, CollectionEntry>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('cards');
  const [selectedTruck, setSelectedTruck] = useState<typeof BASE_TRUCKS[0] | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    fetch('/api/collection')
      .then((r) => r.json())
      .then((json) => {
        if (json.entries) {
          const map: Record<string, CollectionEntry> = {};
          json.entries.forEach((e: CollectionEntry) => { map[e.truckId] = e; });
          setEntries(map);

          // Check if all collected
          const allDone = BASE_TRUCKS.every((t) => (map[t.id]?.seenCount ?? 0) > 0);
          if (allDone && BASE_TRUCKS.length > 0) {
            setShowCelebration(true);
            setTimeout(() => setShowConfetti(true), 300);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCollect = (truck: typeof BASE_TRUCKS[0]) => {
    setSelectedTruck(truck);
  };

  const handleConfirmCollect = async (notes: string, photoToken: string) => {
    if (!selectedTruck) return;
    const truck = selectedTruck;
    const now = new Date().toISOString().split('T')[0];
    const existing = entries[truck.id];

    const entry: CollectionEntry = {
      _recordId: existing?._recordId,
      truckId: truck.id,
      seenCount: (existing?.seenCount ?? 0) + 1,
      firstSeenDate: existing?.firstSeenDate || now,
      lastSeenDate: now,
      photoToken: photoToken || existing?.photoToken || '',
      notes: notes || existing?.notes || '',
    };

    setSelectedTruck(null);

    try {
      await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', entry }),
      });
    } catch {}

    const newEntries = { ...entries, [truck.id]: entry };
    setEntries(newEntries);

    // Save to localStorage
    localStorage.setItem('paipai-collection', JSON.stringify(newEntries));

    // Check completion
    const allDone = BASE_TRUCKS.every((t) => (newEntries[t.id]?.seenCount ?? 0) > 0);
    if (allDone && !showCelebration) {
      setShowCelebration(true);
      setTimeout(() => setShowConfetti(true), 300);
    }
  };

  const collectedCount = BASE_TRUCKS.filter((t) => (entries[t.id]?.seenCount ?? 0) > 0).length;
  const progress = collectedCount / BASE_TRUCKS.length;

  return (
    <div className="min-h-screen pb-16" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)' }}>
      {showConfetti && <Confetti />}

      <div className="max-w-5xl mx-auto px-4 pt-6">
        <Link href="/" className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-900 text-sm font-bold transition-colors mb-3">
          ← 返回派派点子站
        </Link>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-6xl mb-1 drop-shadow animate-bounce inline-block">🃏</div>
          <h1 className="text-3xl font-black text-gray-800">派派工程车收集卡</h1>
          <p className="text-amber-600 font-medium text-sm mt-1">翻翻卡 · 集齐10种超酷工程车！🚜</p>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-3xl p-4 shadow-lg mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-black text-gray-700">收集进度</span>
            <span className="text-sm font-black text-amber-500">{collectedCount} / {BASE_TRUCKS.length} 张卡</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700 ease-out flex items-center justify-end pr-2"
              style={{ width: `${Math.max(progress * 100, 4)}%` }}
            >
              {progress > 0.1 && <span className="text-white text-xs font-black">{(progress * 100).toFixed(0)}%</span>}
            </div>
          </div>
          {collectedCount === BASE_TRUCKS.length && (
            <div className="mt-2 text-center text-amber-600 font-black text-sm animate-pulse">
              🎉 太棒啦！派派收集完了所有工程车！🎉
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {([
            { key: 'cards', label: '🃏 翻卡', icon: '🃏' },
            { key: 'album', label: '📒 相册', icon: '📒' },
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

      <div className="max-w-5xl mx-auto px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl animate-spin">🃏</div>
            <p className="text-amber-600 font-medium mt-4">加载中...</p>
          </div>
        ) : tab === 'cards' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-8">
            {BASE_TRUCKS.map((truck, i) => (
              <TruckCardFront
                key={truck.id}
                truck={truck}
                entry={entries[truck.id]}
                onCollect={() => handleCollect(truck)}
                index={i}
                total={BASE_TRUCKS.length}
              />
            ))}
          </div>
        ) : (
          /* Album view */
          <div className="space-y-3 pb-8">
            {BASE_TRUCKS.map((truck) => {
              const entry = entries[truck.id];
              const hasCollected = entry && entry.seenCount > 0;
              const photoUrl = entry?.photoToken ? `/api/photo?token=${encodeURIComponent(entry.photoToken)}` : '';
              return (
                <div key={truck.id}
                  className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${hasCollected ? 'border-amber-300' : 'border-gray-100 opacity-60'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shrink-0"
                      style={{ background: `${truck.color}22` }}>
                      {hasCollected && photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoUrl} alt={truck.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <span>{truck.emoji}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-gray-800">{truck.name}</h3>
                        {hasCollected && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">⭐ 已收集</span>
                        )}
                        {!hasCollected && (
                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-bold">❓ 未收集</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{truck.category}</p>
                      {hasCollected && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          👀 见过 {entry!.seenCount} 次 · {entry!.lastSeenDate}
                          {entry!.notes && ` · ${entry!.notes}`}
                        </p>
                      )}
                    </div>
                    {!hasCollected && (
                      <button
                        onClick={() => handleCollect(truck)}
                        className="px-3 py-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-xl text-xs font-black shadow hover:shadow-md transition-all active:scale-95 shrink-0"
                      >
                        👀 记录！
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Celebration modal */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCelebration(false)}>
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="text-7xl mb-3 animate-bounce inline-block">🏆</div>
            <h2 className="text-2xl font-black text-amber-600 mb-2">🎉 太厉害啦派派！</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              派派收集到了全部10张<br />工程车收集卡！<br />
              <strong className="text-amber-600">派派是最棒的工程车专家！🚜</strong>
            </p>
            <div className="text-5xl mb-4">🚜🏗️🚚🚒🔧</div>
            <button onClick={() => setShowCelebration(false)}
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-black rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95">
              太棒啦！👏
            </button>
          </div>
        </div>
      )}

      {/* Collect modal */}
      {selectedTruck && (
        <CollectModal
          truck={selectedTruck}
          onClose={() => setSelectedTruck(null)}
          onConfirm={handleConfirmCollect}
        />
      )}

      {/* Fun footer banner */}
      <div className="max-w-5xl mx-auto px-4 mb-6">
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-3xl p-4 text-center shadow-xl">
          <p className="text-white font-black text-base">🃏 派派收集了多少张卡？告诉爸爸吧！🚜</p>
        </div>
      </div>
    </div>
  );
}
