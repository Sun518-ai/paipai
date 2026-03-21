'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CountdownEvent {
  id: string;
  name: string;
  date: string;
  emoji: string;
  color: string;
}

const DEFAULT_EVENTS: CountdownEvent[] = [
  { id: '1', name: '派派生日 🎂', date: '2026-04-01', emoji: '🎂', color: 'from-pink-400 to-rose-500' },
  { id: '2', name: '春节 🧧', date: '2027-01-29', emoji: '🧧', color: 'from-red-400 to-orange-500' },
  { id: '3', name: '儿童节 🎈', date: '2026-06-01', emoji: '🎈', color: 'from-yellow-400 to-green-400' },
  { id: '4', name: '中秋节 🥮', date: '2026-10-06', emoji: '🥮', color: 'from-amber-400 to-yellow-500' },
];

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function getTimeLeft(targetDate: string) {
  const now = Date.now();
  const target = new Date(targetDate).getTime();
  const diff = target - now;

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

function CountdownCard({ event, onDelete }: { event: CountdownEvent; onDelete: (id: string) => void }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(event.date));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(event.date));
    }, 1000);
    return () => clearInterval(timer);
  }, [event.date]);

  if (!timeLeft) {
    return (
      <div className={`bg-gradient-to-br ${event.color} rounded-3xl p-6 text-white opacity-60`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{event.emoji}</span>
            <h3 className="text-xl font-bold">{event.name}</h3>
          </div>
          <button
            onClick={() => onDelete(event.id)}
            className="text-white/60 hover:text-white/90 text-sm transition-colors"
          >
            🗑️
          </button>
        </div>
        <p className="text-2xl font-bold">今天就是这一天！🎉</p>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${event.color} rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{event.emoji}</span>
          <div>
            <h3 className="text-xl font-bold">{event.name}</h3>
            <p className="text-white/70 text-sm">{event.date}</p>
          </div>
        </div>
        <button
          onClick={() => onDelete(event.id)}
          className="text-white/60 hover:text-white/90 text-sm transition-colors"
          title="删除"
        >
          🗑️
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { v: timeLeft.days, l: '天' },
          { v: timeLeft.hours, l: '时' },
          { v: timeLeft.minutes, l: '分' },
          { v: timeLeft.seconds, l: '秒' },
        ].map(({ v, l }) => (
          <div key={l} className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
            <div className="text-2xl font-black">{pad(v)}</div>
            <div className="text-xs text-white/70">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CountdownPage() {
  const [events, setEvents] = useState<CountdownEvent[]>(() => {
    try { const s = localStorage.getItem('paipai-countdown'); if (s) return JSON.parse(s); } catch {}
    return DEFAULT_EVENTS;
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', date: '', emoji: '🎉', color: 'from-indigo-400 to-purple-500' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('paipai-countdown', JSON.stringify(events));
    } catch {}
  }, [events]);

  const handleDelete = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAdd = () => {
    if (!newEvent.name.trim() || !newEvent.date) return;
    setAdding(true);
    setTimeout(() => {
      setEvents((prev) => [
        ...prev,
        { ...newEvent, id: Date.now().toString() },
      ]);
      setNewEvent({ name: '', date: '', emoji: '🎉', color: 'from-indigo-400 to-purple-500' });
      setShowAdd(false);
      setAdding(false);
    }, 300);
  };

  const COLORS = [
    'from-indigo-400 to-purple-500',
    'from-pink-400 to-rose-500',
    'from-red-400 to-orange-500',
    'from-yellow-400 to-green-400',
    'from-teal-400 to-cyan-500',
    'from-blue-400 to-indigo-500',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Back */}
      <div className="max-w-4xl mx-auto px-6 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 text-sm font-medium transition-colors"
        >
          ← 返回点子站
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <span className="text-5xl block mb-2">⏰</span>
          <h1 className="text-3xl font-bold text-gray-900">派派倒计时</h1>
          <p className="text-gray-500 mt-1">期待每一个特别的日子 ✨</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {events.map((event) => (
            <CountdownCard key={event.id} event={event} onDelete={handleDelete} />
          ))}

          {/* Add new card */}
          {!showAdd ? (
            <button
              onClick={() => setShowAdd(true)}
              className="border-2 border-dashed border-indigo-200 rounded-3xl p-6 flex items-center justify-center gap-3 text-indigo-400 hover:border-indigo-400 hover:text-indigo-600 transition-all min-h-[160px]"
            >
              <span className="text-3xl">➕</span>
              <span className="font-bold text-lg">添加新倒计时</span>
            </button>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4">添加新倒计时 🎉</h3>
              <input
                type="text"
                placeholder="事件名称，比如：去海洋馆 🐬"
                value={newEvent.name}
                onChange={(e) => setNewEvent((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">选择颜色</p>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewEvent((p) => ({ ...p, color: c }))}
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${c} ${
                        newEvent.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                      } transition-all`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={adding || !newEvent.name.trim() || !newEvent.date}
                  className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {adding ? '添加中...' : '添加'}
                </button>
                <button
                  onClick={() => { setShowAdd(false); setNewEvent({ name: '', date: '', emoji: '🎉', color: 'from-indigo-400 to-purple-500' }); }}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
