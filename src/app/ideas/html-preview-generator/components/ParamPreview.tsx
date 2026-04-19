"use client";

import React, { useState, useCallback } from "react";

export interface ParamControl {
  name: string;
  type: string;
  label: string;
  default: string | number | boolean;
  options?: string[];
}

interface ParamPreviewProps {
  controls: ParamControl[];
  onCopy?: (json: string) => void;
}

/**
 * ParamPreview - JSON 参数预览组件
 * 展示当前参数结构的 JSON 格式，并支持一键复制
 */
export default function ParamPreview({ controls, onCopy }: ParamPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // 生成 JSON 格式的参数声明
  const json = React.useMemo(() => {
    const obj: Record<string, Record<string, unknown>> = {};
    for (const ctrl of controls) {
      obj[ctrl.name] = {
        type: ctrl.type,
        label: ctrl.label,
        default: ctrl.default,
        ...(ctrl.type === "select" && ctrl.options ? { options: ctrl.options } : {}),
      };
    }
    return JSON.stringify(obj, null, 2);
  }, [controls]);

  // 复制到剪贴板
  const copyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      onCopy?.(json);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = json;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      onCopy?.(json);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [json, onCopy]);

  // 统计信息
  const typeStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    for (const ctrl of controls) {
      stats[ctrl.type] = (stats[ctrl.type] || 0) + 1;
    }
    return stats;
  }, [controls]);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
            📋 参数预览
          </span>
          <div className="flex items-center gap-2">
            {Object.entries(typeStats).map(([type, count]) => (
              <span
                key={type}
                className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"
              >
                {type}: {count}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            {isExpanded ? "▼ 收起" : "▶ 展开"}
          </button>
          <button
            onClick={copyJson}
            className="text-xs px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors flex items-center gap-1"
          >
            {copied ? (
              <>
                <span>✅</span>
                <span>已复制</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>复制 JSON</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* JSON 内容 */}
      {isExpanded && (
        <div className="p-4">
          {controls.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400 dark:text-slate-500">
              暂无参数配置
            </div>
          ) : (
            <pre className="text-xs font-mono bg-gray-900 dark:bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto max-h-80 leading-relaxed">
              {json}
            </pre>
          )}
        </div>
      )}

      {/* 底部统计 */}
      {isExpanded && controls.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
            <span>共 {controls.length} 个参数</span>
            <span>格式: JSON</span>
          </div>
        </div>
      )}
    </div>
  );
}
