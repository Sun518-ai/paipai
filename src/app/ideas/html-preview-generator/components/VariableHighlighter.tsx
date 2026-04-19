"use client";

import React, { useRef, useEffect, useCallback } from "react";

interface VariableHighlighterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 带变量高亮的文本输入框
 * - 覆盖层方案：div 叠加在 textarea 上，同步滚动
 * - {变量名} 显示为 indigo 背景色高亮
 */
export default function VariableHighlighter({
  value,
  onChange,
  placeholder = "输入功能描述，例如：创建一个登录表单，包含 {username} 输入框和 {rememberMe} 复选框",
  className = "",
  style,
}: VariableHighlighterProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const hl = highlightRef.current;
    if (!ta || !hl) return;
    hl.scrollTop = ta.scrollTop;
    hl.scrollLeft = ta.scrollLeft;
  }, []);

  // 输入变化时渲染高亮
  const renderHighlighted = useCallback((text: string) => {
    // 转义 HTML
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // 高亮 {变量名}
    const highlighted = escaped.replace(
      /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,
      '<span class="bg-indigo-200 dark:bg-indigo-800 rounded px-0.5 text-indigo-900 dark:text-indigo-100 font-medium">{$1}</span>'
    );

    return highlighted;
  }, []);

  // 同步高度
  useEffect(() => {
    const ta = textareaRef.current;
    const hl = highlightRef.current;
    if (!ta || !hl) return;

    const syncHeight = () => {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
      hl.style.height = `${ta.scrollHeight}px`;
    };

    syncHeight();
    ta.addEventListener("input", syncHeight);
    ta.addEventListener("scroll", syncScroll);
    return () => {
      ta.removeEventListener("input", syncHeight);
      ta.removeEventListener("scroll", syncScroll);
    };
  }, [syncScroll]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab 插入缩进
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onChange(newValue);
      // 恢复光标位置
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className={`relative ${className}`} style={style}>
      {/* 高亮覆盖层 */}
      <div
        ref={highlightRef}
        className="absolute inset-0 overflow-auto pointer-events-none whitespace-pre-wrap break-words text-transparent p-3 text-sm leading-relaxed font-mono"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: renderHighlighted(value) || "&#8203;" }}
      />

      {/* 真实输入框 */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        placeholder={placeholder}
        rows={4}
        className="relative w-full resize-none rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 p-3 text-sm leading-relaxed font-mono outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
        style={{
          minHeight: "120px",
          position: "relative",
          zIndex: 1,
          // 让透明文字看到下面的高亮层
          color: "transparent",
          caretColor: "currentColor",
        }}
      />
    </div>
  );
}
