'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import AutoHeightIframe from './AutoHeightIframe';

interface HtmlPreviewProps {
  html: string;
  /** Optional params to substitute into the template before preview */
  params?: Record<string, string>;
  /** Render template with params substituted (default true) */
  substituteParams?: boolean;
}

export default function HtmlPreview({ html, params = {}, substituteParams = true }: HtmlPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const codeRef = useRef<HTMLElement>(null);

  // Apply param substitution to get rendered HTML for preview
  const renderedHtml = useCallback(() => {
    if (!html || !substituteParams) return html;
    let result = html;
    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, value ?? '');
    }
    return result;
  }, [html, params, substituteParams])();

  // Highlight code when switching to code tab
  useEffect(() => {
    if (activeTab === 'code' && codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [activeTab, html]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
      {/* Tab Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            👁️ 预览
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'code'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            📄 代码
          </button>
        </div>
        <button
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            copied
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
          }`}
        >
          {copied ? '✅ 已复制' : '📋 复制代码'}
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[200px] max-h-[70vh] overflow-auto">
        {activeTab === 'preview' ? (
          <AutoHeightIframe
            html={renderedHtml}
            showLoader={true}
          />
        ) : (
          <div className="overflow-auto bg-gray-50 dark:bg-slate-900">
            <pre className="p-4 m-0">
              <code ref={codeRef} className="hljs text-sm">
                {html || '// 代码将在这里显示'}
              </code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
