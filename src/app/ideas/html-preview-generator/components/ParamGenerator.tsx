"use client";

import React, { useState, useCallback } from "react";
import { ParsedVariable, defaultControls, type InferredType } from "../hooks/useVariableParser";
import ParamPreview, { type ParamControl } from "./ParamPreview";

interface ParamGeneratorProps {
  variables: ParsedVariable[];
  uniqueNames: string[];
  duplicates: string[];
  onJsonChange?: (json: string) => void;
  /** 上报用户输入的实际值，供变量绑定使用 */
  onValuesChange?: (values: Record<string, string | number | boolean>) => void;
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

export default function ParamGenerator({ variables, uniqueNames, duplicates, onJsonChange, onValuesChange }: ParamGeneratorProps) {
  const [controls, setControls] = useState<Control[]>(() =>
    defaultControls(uniqueNames).map((c) => ({
      ...c,
      type: c.type as ControlType,
      options: c.type === "select" ? (c.options ?? ["选项1", "选项2", "选项3"]) : [],
    }))
  );

  // 用户输入的值 state，用于变量绑定
  const [values, setValues] = React.useState<Record<string, string | number | boolean>>(() => {
    const init: Record<string, string | number | boolean> = {};
    for (const c of defaultControls(uniqueNames)) {
      init[c.name] = c.default;
    }
    return init;
  });

  // 同步 controls 数量与 variables 变化，同时同步默认值到 values
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

    // 同步 values：新增变量用默认值，保留已有变量的值
    setValues((prev) => {
      const next: Record<string, string | number | boolean> = {};
      for (const name of uniqueNames) {
        const ctrl = defaultControls(uniqueNames).find((c) => c.name === name);
        next[name] = name in prev ? prev[name] : (ctrl?.default ?? "");
      }
      return next;
    });
  }, [uniqueNames.length]);

  const updateControl = useCallback((name: string, patch: Partial<Control>) => {
    setControls((prev) =>
      prev.map((c) => (c.name === name ? { ...c, ...patch } : c))
    );
  }, []);

  // 更新用户输入值
  const updateValue = useCallback(
    (name: string, value: string | number | boolean) => {
      setValues((prev) => {
        const next = { ...prev, [name]: value };
        onValuesChange?.(next);
        return next;
      });
    },
    [onValuesChange]
  );

  // 初始时上报默认值
  React.useEffect(() => {
    const init: Record<string, string | number | boolean> = {};
    for (const c of defaultControls(uniqueNames)) {
      init[c.name] = c.default;
    }
    setValues(init);
    onValuesChange?.(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 转换为 ParamPreview 格式
  const previewControls: ParamControl[] = React.useMemo(() => {
    return controls.map((ctrl) => ({
      name: ctrl.name,
      type: ctrl.type,
      label: ctrl.label,
      default: ctrl.default,
      options: ctrl.options,
    }));
  }, [controls]);

  if (uniqueNames.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">
        在左栏输入包含 {"{变量名}"} 的功能描述，即可生成参数控件
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {/* 参数值输入区 - 供变量绑定使用 */}
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            ✏️ 参数值输入
          </span>
          <span className="text-xs text-indigo-400">（填入的值会替换 HTML 中的 {"{变量}"}）</span>
        </div>

        <div className="space-y-2">
          {controls.map((ctrl) => (
            <div key={ctrl.name} className="flex items-center gap-2">
              <code className="text-xs font-mono bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 px-1.5 py-0.5 rounded min-w-[80px] truncate">
                {`{${ctrl.name}}`}
              </code>
              <label className="text-xs text-gray-500 dark:text-slate-400 min-w-[40px]">
                {ctrl.label}
              </label>

              {ctrl.type === "boolean" ? (
                <button
                  onClick={() => updateValue(ctrl.name, !values[ctrl.name])}
                  className={`flex-1 text-sm rounded-md border px-2 py-1 text-left transition-colors ${
                    values[ctrl.name]
                      ? "bg-green-100 border-green-300 text-green-800"
                      : "bg-gray-100 border-gray-200 text-gray-600"
                  }`}
                >
                  {values[ctrl.name] ? "✅ true" : "○ false"}
                </button>
              ) : ctrl.type === "select" ? (
                <select
                  value={String(values[ctrl.name] ?? "")}
                  onChange={(e) => updateValue(ctrl.name, e.target.value)}
                  className="flex-1 text-sm rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-gray-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {ctrl.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={ctrl.type === "number" ? "number" : ctrl.type}
                  value={String(values[ctrl.name] ?? "")}
                  onChange={(e) => {
                    const v = ctrl.type === "number" ? Number(e.target.value) : e.target.value;
                    updateValue(ctrl.name, v);
                  }}
                  placeholder={`请输入 ${ctrl.label}…`}
                  className="flex-1 text-sm rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-gray-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-gray-300 dark:placeholder:text-slate-600"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* JSON 预览 - 使用独立的 ParamPreview 组件 */}
      <ParamPreview
        controls={previewControls}
        onCopy={(json) => onJsonChange?.(json)}
      />
    </div>
  );
}
