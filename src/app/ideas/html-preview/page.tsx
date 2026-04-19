'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import VariableParser, { Variable, parseVariables } from './components/VariableParser';
import ParamGenerator from './components/ParamGenerator';
import HtmlGenerator from './components/HtmlGenerator';
import HtmlPreview from './components/HtmlPreview';

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
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

const DEFAULT_DESCRIPTION = `生成一个简洁的着陆页，包含以下元素：
- 标题: {{title=欢迎到来}}
- 副标题: {{subtitle=这是一个示例页面}}
- 主色调: {{color=#6366f1}}
- 描述文字: {{description=在这里输入你的内容}}`;

export default function HtmlPreviewPage() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  const [splitRatio, setSplitRatio] = useState(42);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize theme
  useEffect(() => {
    const stored = localStorage.getItem('paipai-html-preview-theme');
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
      document.documentElement.dataset.theme = stored;
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolved = prefersDark ? 'dark' : 'light';
      setTheme(resolved);
      document.documentElement.dataset.theme = resolved;
    }
  }, []);

  // Parse variables
  useEffect(() => {
    const vars = parseVariables(description);
    setVariables(vars);
    setParamValues(prev => {
      const updated = { ...prev };
      vars.forEach((v: Variable) => {
        if (v.defaultValue && !updated[v.name]) {
          updated[v.name] = v.defaultValue;
        }
      });
      return updated;
    });
  }, [description]);

  // Drag logic
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setSplitRatio(Math.min(Math.max((x / rect.width) * 100, 25), 70));
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleDividerTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current || !e.touches[0]) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      setSplitRatio(Math.min(Math.max((x / rect.width) * 100, 25), 70));
    };
    const handleTouchEnd = () => setIsDragging(false);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('paipai-html-preview-theme', next);
  };

  const handleParamChange = (name: string, value: string) => {
    setParamValues(prev => ({ ...prev, [name]: value }));
  };

  const bgStyle = {
    background: `linear-gradient(to bottom right, var(--bg-gradient-start), var(--bg-gradient-mid), var(--bg-gradient-end))`,
  };

  return (
    <div className="min-h-screen" style={bgStyle} ref={containerRef}>
      {/* Header */}
      <div className="max-w-[1600px] mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium transition-colors"
          >
            ← 返回点子站
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">HTML预览生成器</h1>
            <button
              onClick={toggleTheme}
              className="ml-2 w-9 h-9 flex items-center justify-center rounded-full bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-600 transition-all text-lg"
              title={theme === 'light' ? '深色模式' : '浅色模式'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </div>

      {/* Main dual-panel layout */}
      <div
        className={`max-w-[1600px] mx-auto px-4 pb-6 ${isMobile ? 'flex flex-col' : 'relative'}`}
        style={isMobile ? {} : { height: 'calc(100vh - 100px)' }}
      >
        {/* Left Panel */}
        <div
          className={`
            ${isMobile ? 'w-full' : 'overflow-y-auto'}
            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm
            ${!isMobile ? 'border-r border-gray-200 dark:border-slate-700' : ''}
          `}
          style={isMobile ? { height: '50vh' } : { width: `${splitRatio}%`, height: '100%' }}
        >
          <div className="p-4 space-y-4">
            {/* Description Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">📖 功能描述</h3>
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  使用 {'{{变量名}}'} 定义变量
                </span>
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="描述你想要生成的HTML页面..."
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            </div>

            {/* Variable Parser */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
              <VariableParser description={description} onVariablesChange={setVariables} />
            </div>

            {/* Param Generator */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
              <ParamGenerator variables={variables} values={paramValues} onChange={handleParamChange} />
            </div>

            {/* Html Generator */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
              <HtmlGenerator
                description={description}
                params={paramValues}
                onHtmlChange={setHtml}
              />
            </div>

            {/* Quick Reference */}
            <details className="group">
              <summary className="text-xs text-gray-400 dark:text-slate-500 cursor-pointer hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                📚 变量语法参考
              </summary>
              <div className="mt-2 p-2.5 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-mono text-gray-600 dark:text-slate-400 space-y-1">
                <p><code className="text-indigo-500">{'{{name}}'}</code> — 文本变量</p>
                <p><code className="text-indigo-500">{'{{name:text}}'}</code> — 指定类型</p>
                <p><code className="text-indigo-500">{'{{name=default}}'}</code> — 带默认值</p>
                <p><code className="text-indigo-500">{'{{name:color=#ff0000}}'}</code> — 颜色+默认值</p>
                <p className="pt-1 border-t border-gray-200 dark:border-slate-700">
                  类型: <span className="text-gray-500">text, color, number, textarea</span>
                </p>
              </div>
            </details>
          </div>
        </div>

        {/* Draggable Divider (desktop only) */}
        {!isMobile && (
          <div
            className={`
              absolute top-0 bottom-0 z-10 cursor-col-resize select-none
              flex items-center justify-center
              transition-colors duration-150
              ${isDragging ? 'bg-indigo-200 dark:bg-indigo-800' : 'hover:bg-indigo-100 dark:hover:bg-indigo-900'}
            `}
            style={{ left: `calc(${splitRatio}% - 6px)`, width: '12px' }}
            onMouseDown={handleDividerMouseDown}
            onTouchStart={handleDividerTouchStart}
          >
            <div className="w-1 h-12 rounded-full bg-gray-300 dark:bg-slate-600 group-hover:bg-indigo-400 transition-colors" />
          </div>
        )}

        {/* Right Panel - Preview */}
        <div
          className={`${isMobile ? 'w-full' : 'overflow-hidden'} bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm`}
          style={isMobile ? { height: '50vh' } : {
            position: 'absolute',
            left: `calc(${splitRatio}% + 6px)`,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        >
          <div className="h-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">👁️ 实时预览</h3>
              <span className="text-xs text-gray-400 dark:text-slate-500">{html.length} 字符</span>
            </div>
            <div className="h-[calc(100%-2rem)]">
              <HtmlPreview html={html} />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        [data-theme='dark'] {
          --bg-gradient-start: #1e1b4b;
          --bg-gradient-mid: #1e293b;
          --bg-gradient-end: #2e1065;
        }
        [data-theme='light'] {
          --bg-gradient-start: #eef2ff;
          --bg-gradient-mid: #ffffff;
          --bg-gradient-end: #faf5ff;
        }
        body { overflow: ${isDragging ? 'hidden' : 'auto'}; }
        * { user-select: ${isDragging ? 'none' : 'auto'}; }
      `}</style>
    </div>
  );
}
