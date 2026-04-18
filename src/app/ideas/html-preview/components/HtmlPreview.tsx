'use client';

import { useState, useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

interface HtmlPreviewProps {
  html: string;
}

export default function HtmlPreview({ html }: HtmlPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const codeRef = useRef<HTMLElement>(null);

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
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      {/* Tab Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'preview'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            👁️ 预览
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'code'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📄 代码
          </button>
        </div>
        <button
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
          }`}
        >
          {copied ? '✅ 已复制' : '📋 复制代码'}
        </button>
      </div>

      {/* Content */}
      <div className="h-[500px]">
        {activeTab === 'preview' ? (
          <iframe
            srcDoc={html}
            sandbox="allow-scripts"
            title="HTML Preview"
            className="w-full h-full border-0"
          />
        ) : (
          <div className="h-full overflow-auto bg-gray-50">
            <pre className="p-4 m-0">
              <code ref={codeRef} className="hljs text-sm">
                {html}
              </code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
