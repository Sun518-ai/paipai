'use client';

import { useState } from 'react';
import type { SummarySegment } from './ContentParser';

interface SummaryCardProps {
  content: string;
}

const COLLAPSED_LINES = 3;

export function SummaryCard({ content }: SummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const lines = content.split('\n');
  const needsCollapsing = lines.length > COLLAPSED_LINES;
  const displayContent = isExpanded ? content : lines.slice(0, COLLAPSED_LINES).join('\n');
  
  return (
    <div className="my-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📖</span>
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
            摘要
          </span>
        </div>
        {needsCollapsing && (
          <span className="text-xs text-indigo-500 dark:text-indigo-400">
            {isExpanded ? '点击折叠' : '点击展开'}
          </span>
        )}
      </button>
      
      {/* Content */}
      <div className="p-3">
        <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
          {displayContent}
        </p>
        {!isExpanded && needsCollapsing && (
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
            ... 共 {lines.length} 行
          </p>
        )}
      </div>
    </div>
  );
}

export type { SummarySegment };
