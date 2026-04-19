'use client';

import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'paipai-html-preview-history';
const MAX_HISTORY = 10;

export interface HistoryItem {
  id: string;
  html: string;
  timestamp: number;
  label?: string;
}

/**
 * Load history from localStorage
 */
function loadHistory(): HistoryItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

/**
 * Save history to localStorage
 */
function saveHistory(history: HistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {}
}

/**
 * Generate a short label from HTML content
 */
function generateLabel(html: string): string {
  // Try to extract text content from the HTML
  const textMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (textMatch) return textMatch[1].substring(0, 30);

  // Try to get any text content
  const bodyMatch = html.match(/<body[^>]*>([^<]+)/i);
  if (bodyMatch) return bodyMatch[1].substring(0, 30).trim();

  // Fallback: use timestamp
  return `生成 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
}

interface GenerationHistoryProps {
  onSelect: (html: string) => void;
  currentHtml: string;
  disabled?: boolean;
}

export default function GenerationHistory({
  onSelect,
  currentHtml,
  disabled = false,
}: GenerationHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Save current HTML to history
   */
  const saveToHistory = (html: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(36),
      html,
      timestamp: Date.now(),
      label: generateLabel(html),
    };

    setHistory((prev) => {
      // Avoid duplicate consecutive entries
      if (prev.length > 0 && prev[0].html === html) {
        return prev;
      }
      const updated = [newItem, ...prev].slice(0, MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
  };

  /**
   * Delete a history item
   */
  const deleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveHistory(updated);
      return updated;
    });
  };

  /**
   * Handle selecting an item
   */
  const handleSelect = (item: HistoryItem) => {
    onSelect(item.html);
    setIsOpen(false);
  };

  // Expose saveToHistory via a custom event
  useEffect(() => {
    const handleSaveHistory = (event: CustomEvent<string>) => {
      saveToHistory(event.detail);
    };
    window.addEventListener('save-html-history' as any, handleSaveHistory as EventListener);
    return () => window.removeEventListener('save-html-history' as any, handleSaveHistory as EventListener);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500'
            : isOpen
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
        }`}
        title="历史记录"
      >
        <span>📜</span>
        <span>历史</span>
        {history.length > 0 && (
          <span className="bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {history.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">📜 生成历史</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                最多 {MAX_HISTORY} 条
              </span>
            </div>
          </div>

          {/* History List */}
          <div className="max-h-64 overflow-y-auto">
            {history.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                <div className="text-2xl mb-2">📭</div>
                暂无历史记录
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                {history.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleSelect(item)}
                      className="w-full px-4 py-3 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">
                            {item.label}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {new Date(item.timestamp).toLocaleString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        <button
                          onClick={(e) => deleteItem(e, item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer - Save Current */}
          {currentHtml.trim() && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <button
                onClick={() => {
                  saveToHistory(currentHtml);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                💾 保存当前到历史
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Export save function for external use
export { saveHistory as saveHistoryToStorage };
