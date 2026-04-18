'use client';

import { useState } from 'react';
import Link from 'next/link';
import HtmlPreview from './components/HtmlPreview';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Back */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 text-sm font-medium transition-colors"
        >
          ← 返回点子站
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <span className="text-5xl block mb-2">🎨</span>
          <h1 className="text-3xl font-bold text-gray-900">HTML预览生成器</h1>
          <p className="text-gray-500 mt-1">输入HTML代码，实时预览效果 ✨</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">📝 HTML编辑器</h2>
            </div>
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              className="w-full h-[460px] p-4 border border-gray-200 rounded-xl font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
              placeholder="在这里输入HTML代码..."
            />
          </div>

          {/* Preview */}
          <div>
            <h2 className="font-bold text-gray-800 mb-4">👁️ 实时预览</h2>
            <HtmlPreview html={html} />
          </div>
        </div>
      </div>
    </div>
  );
}
