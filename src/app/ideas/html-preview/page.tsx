'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import VariableParser, { Variable } from './components/VariableParser';
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
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 400px; }
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

interface ExtractedVariable {
  name: string;
  type: 'text' | 'color' | 'number' | 'textarea';
  label: string;
  defaultValue: string;
}

export default function HtmlPreviewPage() {
  const [description, setDescription] = useState('');
  const [optimizedDescription, setOptimizedDescription] = useState('');
  const [extractedVariables, setExtractedVariables] = useState<ExtractedVariable[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePreviewChunk = useCallback((chunk: string) => {
    setIsGenerating(true);
    setHtml(chunk);
  }, []);

  const handleGenerateComplete = useCallback(() => {
    setIsGenerating(false);
  }, []);

  // Step state
  const [currentStep, setCurrentStep] = useState<'input' | 'confirm' | 'generate'>('input');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  // Layout state
  const [splitRatio, setSplitRatio] = useState(42);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isExporting, setIsExporting] = useState(false);
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

  const handleOptimize = async () => {
    if (!description.trim()) {
      setOptimizeError('请先输入功能描述');
      return;
    }
    setIsOptimizing(true);
    setOptimizeError(null);
    try {
      const res = await fetch('/ideas/html-preview/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error(`请求失败: ${res.status}`);
      const data = await res.json();
      setOptimizedDescription(data.optimizedDescription);
      setExtractedVariables(data.variables || []);
      // Initialize param values
      const initial: Record<string, string> = {};
      (data.variables || []).forEach((v: ExtractedVariable) => {
        initial[v.name] = v.defaultValue || '';
      });
      setParamValues(initial);
      setCurrentStep('confirm');
    } catch (err) {
      setOptimizeError((err as Error).message || '优化失败');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleGenerate = () => {
    if (!optimizedDescription.trim()) {
      return;
    }
    // Already in confirm step - no step change needed, HtmlGenerator is shown in confirm step
  };

  const handleBack = () => {
    setCurrentStep('input');
  };

  const handleEditDescription = () => {
    setCurrentStep('input');
  };

  const handleExport = async () => {
    if (!html || html === DEFAULT_HTML) return;
    setIsExporting(true);
    try {
      const res = await fetch('/ideas/html-preview/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlTemplate: html, // export the template with {{variables}}
          variables: extractedVariables,
          description,
        }),
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `html-preview-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert((err as Error).message || '导出失败');
    } finally {
      setIsExporting(false);
    }
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

      {/* Step indicator */}
      <div className="max-w-[1600px] mx-auto px-4 pb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className={`flex items-center gap-1 px-3 py-1 rounded-full ${currentStep === 'input' ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300'}`}>
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{currentStep === 'input' ? '1' : '✓'}</span>
            输入描述
          </span>
          <span className="text-gray-300">→</span>
          <span className={`flex items-center gap-1 px-3 py-1 rounded-full ${currentStep === 'confirm' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">2</span>
            确认变量 &amp; 生成
          </span>
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

            {/* Step 1: Input */}
            {currentStep === 'input' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">📝 用自然语言描述你想要的界面</h3>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={6}
                    placeholder="例如：创建一个个人名片页面，包含姓名、职位、联系方式，有渐变背景和一个好看的头像占位区域"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  />
                </div>
                {optimizeError && (
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                    {optimizeError}
                  </div>
                )}
                <button
                  onClick={handleOptimize}
                  disabled={isOptimizing || !description.trim()}
                  className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isOptimizing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      AI 优化中...
                    </>
                  ) : (
                    <>✨ 优化描述 & 提取变量</>
                  )}
                </button>
              </div>
            )}

            {/* Step 2: Confirm variables */}
            {currentStep === 'confirm' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">🤖 AI 优化后的描述</h3>
                    <button onClick={handleEditDescription} className="text-xs text-indigo-500 hover:text-indigo-700">
                      修改描述
                    </button>
                  </div>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap">
                    {optimizedDescription}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">⚙️ 提取的参数</h3>
                  {extractedVariables.length === 0 ? (
                    <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 text-sm text-gray-500 text-center">
                      未提取到参数，将生成静态页面
                    </div>
                  ) : (
                    <ParamGenerator
                      variables={extractedVariables.map(v => ({
                        name: v.name,
                        type: v.type,
                        label: v.label,
                        defaultValue: v.defaultValue,
                      }))}
                      values={paramValues}
                      onChange={handleParamChange}
                    />
                  )}
                </div>

                {/* HtmlGenerator: shows inline for immediate generation */}
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                  <HtmlGenerator
                    description={optimizedDescription}
                    params={paramValues}
                    onHtmlChange={setHtml}
                    onChunk={handlePreviewChunk}
                    onComplete={handleGenerateComplete}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 font-medium rounded-xl transition-colors"
                  >
                    ← 返回修改描述
                  </button>
                </div>
              </div>
            )}
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
            <div className="w-1 h-12 rounded-full bg-gray-300 dark:bg-slate-600" />
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
              <div className="flex items-center gap-2">
                {html && html !== DEFAULT_HTML && (
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                  >
                    {isExporting ? '导出中...' : '📦 导出 ZIP'}
                  </button>
                )}
                <span className="text-xs text-gray-400 dark:text-slate-500">{html.length} 字符</span>
              </div>
            </div>
            <div className="h-full overflow-auto">
              <HtmlPreview
                html={html}
                params={paramValues}
                substituteParams={true}
              />
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
