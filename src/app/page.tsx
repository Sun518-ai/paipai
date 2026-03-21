'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ideas } from '@/lib/ideas';

const statusLabels: Record<string, { label: string; color: string }> = {
  planned: { label: '计划中', color: 'bg-gray-100 text-gray-600' },
  wip: { label: '进行中', color: 'bg-yellow-100 text-yellow-700' },
  done: { label: '已完成', color: 'bg-green-100 text-green-700' },
};

export default function HomePage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return ideas;
    return ideas.filter(
      (idea) =>
        idea.title.toLowerCase().includes(q) ||
        idea.description.toLowerCase().includes(q) ||
        idea.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            💡 派派的点子站
          </h1>
          <p className="text-gray-500 text-lg mb-8">
            记录派派的每一个奇妙想法 ✨
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <input
              type="text"
              placeholder="搜索点子..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-5 py-3 pl-12 text-lg border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
              🔍
            </span>
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-6xl mb-4">🔭</p>
            <p className="text-xl">没有找到相关的点子</p>
            <p className="text-sm mt-1">试试换个关键词搜索吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((idea) => {
              const status = statusLabels[idea.status];
              return (
                <Link
                  key={idea.id}
                  href={`/ideas/${idea.id}`}
                  className="group bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{idea.icon}</span>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {idea.title}
                        </h2>
                        <p className="text-sm text-gray-400">{idea.date}</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {idea.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {idea.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-indigo-50 text-indigo-500 px-2 py-1 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 text-indigo-500 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    打开项目
                    <span>→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-16 text-center text-gray-400 text-sm">
          <p>已有 {ideas.length} 个点子 · 持续更新中 🚀</p>
        </div>
      </div>
    </main>
  );
}
