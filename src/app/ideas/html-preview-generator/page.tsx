"use client";

import React, { useState, useCallback } from "react";
import VariableHighlighter from "./components/VariableHighlighter";
import ParamGenerator from "./components/ParamGenerator";
import { parseVariables } from "./hooks/useVariableParser";

export default function HtmlPreviewGeneratorPage() {
  const [description, setDescription] = useState("");
  const [paramJson, setParamJson] = useState("");
  const [leftWidth, setLeftWidth] = useState(50); // percent
  const [isDragging, setIsDragging] = useState(false);

  const parsed = React.useMemo(() => parseVariables(description), [description]);

  // 拖拽分割线
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = leftWidth;

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      const container = document.getElementById("split-container");
      if (!container) return;
      const newWidth = startWidth + (delta / container.offsetWidth) * 100;
      setLeftWidth(Math.max(25, Math.min(75, newWidth)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [leftWidth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xl">🎨</span>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            HTML 预览生成器
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
            AI Powered
          </span>
          <div className="ml-auto flex items-center gap-2">
            <a
              href="/ideas"
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              ← 返回点子站
            </a>
          </div>
        </div>
      </div>

      {/* 快捷提示 */}
      <div className="max-w-screen-xl mx-auto px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
          <span>💡 提示：在描述中使用</span>
          <code className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 px-1 rounded">
            {"{变量名}"}
          </code>
          <span>声明变量，AI 将自动生成对应的参数控件</span>
        </div>
      </div>

      {/* Split Panel */}
      <div
        id="split-container"
        className={`max-w-screen-xl mx-auto px-4 pb-6 flex gap-0 ${isDragging ? "select-none" : ""}`}
        style={{ height: "calc(100vh - 120px)" }}
      >
        {/* 左侧：输入区 */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: `${leftWidth}%` }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-700 dark:text-slate-300">
              📝 功能描述
            </h2>
            {parsed.uniqueNames.length > 0 && (
              <span className="text-xs text-indigo-500">
                {parsed.uniqueNames.length} 个变量
              </span>
            )}
          </div>
          <VariableHighlighter
            value={description}
            onChange={setDescription}
            className="flex-1"
            style={{ minHeight: 0 }}
          />

          {/* 变量列表 */}
          {parsed.uniqueNames.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {parsed.uniqueNames.map((name) => (
                <span
                  key={name}
                  className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 font-mono"
                >
                  {`{${name}}`}
                </span>
              ))}
            </div>
          )}

          {/* 参数生成器 */}
          <div className="mt-4 flex-1 overflow-auto">
            <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              ⚙️ 参数控件
            </h3>
            <ParamGenerator
              variables={parsed.variables}
              uniqueNames={parsed.uniqueNames}
              duplicates={parsed.duplicates}
              onJsonChange={setParamJson}
            />
          </div>
        </div>

        {/* 拖拽分割线 */}
        <div
          className="w-1 flex-shrink-0 cursor-col-resize flex items-center justify-center group"
          onMouseDown={handleMouseDown}
        >
          <div className="w-1 h-12 rounded-full bg-gray-200 dark:bg-slate-700 group-hover:bg-indigo-400 transition-colors" />
        </div>

        {/* 右侧：预览区 */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: `${100 - leftWidth}%` }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-700 dark:text-slate-300">
              🖥️ HTML 预览
            </h2>
            <div className="flex items-center gap-2">
              {paramJson && (
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  基于 {parsed.uniqueNames.length} 个参数生成
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center">
            {description ? (
              <div className="text-center px-6">
                <div className="text-4xl mb-3">🚀</div>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
                  填写左侧参数后，点击生成按钮
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  HTML 预览将在这里显示
                </p>
                <button className="mt-4 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  生成 HTML
                </button>
              </div>
            ) : (
              <div className="text-center px-6">
                <div className="text-5xl mb-3 opacity-30">🎨</div>
                <p className="text-sm text-gray-400 dark:text-slate-500">
                  在左侧输入功能描述开始
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
