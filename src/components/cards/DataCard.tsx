'use client';

import type { DataSegment } from './ContentParser';

interface DataCardProps {
  metrics: Record<string, string | number>;
}

export function DataCard({ metrics }: DataCardProps) {
  const entries = Object.entries(metrics);
  
  if (entries.length === 0) return null;
  
  return (
    <div className="my-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center gap-2 bg-gray-50 dark:bg-slate-700/50">
        <span className="text-base">📊</span>
        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
          数据指标
        </span>
      </div>
      
      {/* Content */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-3">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3"
            >
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate mb-1">
                {key}
              </p>
              <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export type { DataSegment };
