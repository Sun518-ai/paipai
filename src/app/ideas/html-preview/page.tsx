'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import HtmlPreview from './components/HtmlPreview';
import GenerationHistory from './components/GenerationHistory';
import LoadingSpinner from './components/LoadingSpinner';
import { useHotkey } from './hooks/useHotkey';

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .card {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 400px;
    }
    h1 { color: #333; margin-bottom: 10px; }
    p { color: #666; line-height: 1.6; }
    .emoji { font-size: 60px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">🎨</div>
    <h1>HTML预览生成器</h1>
    <p>在这里输入你的HTML代码，实时预览效果！</p>
  </div>
</body>
</html>`;

export default function HtmlPreviewPage() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [isGenerating, setIsGenerating] = useState(false);
  const [historyKey, setHistoryKey] = useState(0); // Force re-render for history

  // Simulate generation with loading state
  const handleGenerate = useCallback(() => {
    if (isGenerating) return;
    setIsGenerating(true);

    // Simulate generation delay (replace with actual AI generation API call)
    setTimeout(() => {
      setIsGenerating(false);
      // Dispatch custom event to save to history
      window.dispatchEvent(new CustomEvent('save-html-history', { detail: html }));
      setHistoryKey((k) => k + 1);
    }, 1500);
  }, [html, isGenerating]);

  // Register Ctrl+Enter hotkey
  useHotkey({
    onTrigger: handleGenerate,
    enabled: !isGenerating,
  });

  // Handle history selection
  const handleHistorySelect = useCallback((selectedHtml: string) => {
    setHtml(selectedHtml);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      {/* Back */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium transition-colors"
        >
          ← 返回点子站
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <span className="text-5xl block mb-2">🎨</span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">HTML预览生成器</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            输入HTML代码，实时预览效果 ✨
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            按 <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300 font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-300 font-mono">Enter</kbd> 触发生成
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 dark:text-gray-100">📝 HTML编辑器</h2>
              <div className="flex items-center gap-2">
                {isGenerating && (
                  <LoadingSpinner size="sm" text="生成中..." />
                )}
                <GenerationHistory
                  key={historyKey}
                  onSelect={handleHistorySelect}
                  currentHtml={html}
                  disabled={isGenerating}
                />
              </div>
            </div>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              className="w-full h-[460px] p-4 border border-gray-200 dark:border-gray-700 rounded-xl font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="在这里输入HTML代码..."
              disabled={isGenerating}
            />
          </div>

          {/* Preview */}
          <div>
            <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4">👁️ 实时预览</h2>
            {isGenerating ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 h-[500px] flex flex-col items-center justify-center">
                <LoadingSpinner size="lg" text="正在生成预览..." />
              </div>
            ) : (
              <HtmlPreview html={html} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
