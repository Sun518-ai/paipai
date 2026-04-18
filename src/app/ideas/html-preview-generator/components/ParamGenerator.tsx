"use client";

import React, { useState, useCallback } from "react";
import { ParsedVariable, defaultControls, generateJsonParams, type InferredType } from "../hooks/useVariableParser";

interface ParamGeneratorProps {
  variables: ParsedVariable[];
  uniqueNames: string[];
  duplicates: string[];
  onJsonChange?: (json: string) => void;
}

type ControlType = InferredType | "text" | "number" | "password" | "email" | "url" | "boolean" | "select";

interface Control {
  name: string;
  type: ControlType;
  label: string;
  default: string | number | boolean;
  options: string[];
}

const TYPE_LABELS: Record<ControlType, string> = {
  text: "文本",
  number: "数字",
  password: "密码",
  email: "邮箱",
  url: "链接",
  boolean: "开关",
  select: "选择",
};

const TYPE_COLORS: Record<ControlType, string> = {
  text: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  number: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  password: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  email: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  url: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  boolean: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  select: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

export default function ParamGenerator({ variables, uniqueNames, duplicates, onJsonChange }: ParamGeneratorProps) {
  const [controls, setControls] = useState<Control[]>(() =>
    defaultControls(uniqueNames).map((c) => ({
      ...c,
      type: c.type as ControlType,
      options: c.type === "select" ? (c.options ?? ["选项1", "选项2", "选项3"]) : [],
    }))
  );
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);

  // 同步 controls 数量与 variables 变化
  React.useEffect(() => {
    setControls((prev) => {
      const defaults = defaultControls(uniqueNames);
      const newControls: Control[] = defaults.map((d) => {
        const existing = prev.find((p) => p.name === d.name);
        return {
          name: d.name,
          type: (existing?.type ?? d.type) as ControlType,
          label: existing?.label ?? d.label,
          default: existing?.default ?? d.default,
          options: existing?.options ?? (d.type === "select" ? ["选项1", "选项2", "选项3"] : []),
        };
      });
      return newControls;
    });
  }, [uniqueNames.length]);

  const updateControl = useCallback((name: string, patch: Partial<Control>) => {
    setControls((prev) =>
      prev.map((c) => (c.name === name ? { ...c, ...patch } : c))
    );
  }, []);

  const json = React.useMemo(() => {
    const obj: Record<string, Record<string, unknown>> = {};
    for (const ctrl of controls) {
      obj[ctrl.name] = {
        type: ctrl.type,
        label: ctrl.label,
        default: ctrl.default,
        ...(ctrl.type === "select" ? { options: ctrl.options } : {}),
      };
    }
    return JSON.stringify(obj, null, 2);
  }, [controls]);

  React.useEffect(() => {
    onJsonChange?.(json);
  }, [json, onJsonChange]);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (uniqueNames.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">
        在左栏输入包含 {"{变量名}"} 的功能描述，即可生成参数控件
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 变量统计 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
            检测到 {uniqueNames.length} 个变量
          </span>
          {duplicates.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              重复: {duplicates.join(", ")}
            </span>
          )}
        </div>
        <button
          onClick={copyJson}
          className="text-xs px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
        >
          {copied ? "✅ 已复制" : "📋 复制 JSON"}
        </button>
      </div>

      {/* 参数控件列表 */}
      <div className="space-y-2">
        {controls.map((ctrl) => (
          <div
            key={ctrl.name}
            className="rounded-lg border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-3 space-y-2"
          >
            {/* 变量名标题 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 px-1.5 py-0.5 rounded">
                  {`{${ctrl.name}}`}
                </code>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${TYPE_COLORS[ctrl.type]}`}>
                  {TYPE_LABELS[ctrl.type]}
                </span>
              </div>
            </div>

            {/* 标签输入 */}
            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">标签</label>
              <input
                type="text"
                value={ctrl.label}
                onChange={(e) => updateControl(ctrl.name, { label: e.target.value })}
                className="w-full text-sm rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-gray-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* 类型选择 + 默认值 */}
            <div className="flex gap-2">
              {/* 类型选择 */}
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">类型</label>
                <select
                  value={ctrl.type}
                  onChange={(e) => {
                    const newType = e.target.value as ControlType;
                    const defaultVal =
                      newType === "boolean" ? false : newType === "number" ? 0 : "";
                    updateControl(ctrl.name, {
                      type: newType,
                      default: defaultVal,
                      options: newType === "select" ? ["选项1", "选项2"] : [],
                    });
                  }}
                  className="w-full text-sm rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-gray-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {(Object.keys(TYPE_LABELS) as ControlType[]).map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              {/* 默认值 */}
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">默认值</label>
                {ctrl.type === "boolean" ? (
                  <button
                    onClick={() => updateControl(ctrl.name, { default: !ctrl.default })}
                    className={`w-full text-sm rounded-md border px-2 py-1 text-left transition-colors ${
                      ctrl.default
                        ? "bg-green-100 border-green-300 text-green-800"
                        : "bg-gray-100 border-gray-200 text-gray-600"
                    }`}
                  >
                    {ctrl.default ? "✅ true" : "○ false"}
                  </button>
                ) : ctrl.type === "select" ? null : (
                  <input
                    type={ctrl.type === "number" ? "number" : "text"}
                    value={String(ctrl.default)}
                    onChange={(e) => {
                      const val = ctrl.type === "number" ? Number(e.target.value) : e.target.value;
                      updateControl(ctrl.name, { default: val });
                    }}
                    className="w-full text-sm rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-gray-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                )}
              </div>
            </div>

            {/* select 选项 */}
            {ctrl.type === "select" && (
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">选项</label>
                <div className="flex flex-wrap gap-1">
                  {ctrl.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...ctrl.options];
                          newOpts[i] = e.target.value;
                          updateControl(ctrl.name, { options: newOpts });
                        }}
                        className="flex-1 text-xs rounded border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-0.5 text-gray-900 dark:text-slate-100 outline-none"
                      />
                      <button
                        onClick={() => {
                          const newOpts = ctrl.options.filter((_, j) => j !== i);
                          updateControl(ctrl.name, { options: newOpts });
                        }}
                        className="text-xs text-red-400 hover:text-red-600 px-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => updateControl(ctrl.name, { options: [...ctrl.options, "新选项"] })}
                    className="text-xs text-indigo-500 hover:text-indigo-700 px-2 py-0.5"
                  >
                    + 添加选项
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* JSON 预览 */}
      <div>
        <button
          onClick={() => setShowJson((v) => !v)}
          className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
        >
          {showJson ? "▼" : "▶"} JSON 预览
        </button>
        {showJson && (
          <pre className="mt-2 p-3 bg-gray-900 dark:bg-slate-900 rounded-lg text-xs text-green-400 overflow-auto max-h-64 font-mono">
            {json}
          </pre>
        )}
      </div>
    </div>
  );
}
