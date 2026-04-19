'use client';

import { Variable } from './VariableParser';

interface ParamGeneratorProps {
  variables: Variable[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

export default function ParamGenerator({ variables, values, onChange }: ParamGeneratorProps) {
  if (variables.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-400 dark:text-slate-500">
          还没有变量，请先在描述中定义变量
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">📝 参数填写</h3>
      <div className="space-y-3">
        {variables.map((v: Variable) => (
          <div key={v.name} className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400 flex items-center gap-1.5">
              <code className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 dark:text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono">
                {v.name}
              </code>
              {v.type === 'color' && <span className="text-gray-400">🎨</span>}
              {v.type === 'number' && <span className="text-gray-400">🔢</span>}
              {v.type === 'textarea' && <span className="text-gray-400">📄</span>}
            </label>

            {v.type === 'color' && (
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={values[v.name] || v.defaultValue || '#6366f1'}
                  onChange={e => onChange(v.name, e.target.value)}
                  className="w-10 h-9 rounded-lg border border-gray-200 dark:border-slate-600 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={values[v.name] || v.defaultValue || '#6366f1'}
                  onChange={e => onChange(v.name, e.target.value)}
                  placeholder={v.defaultValue}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                />
              </div>
            )}

            {v.type === 'number' && (
              <input
                type="number"
                value={values[v.name] || v.defaultValue}
                onChange={e => onChange(v.name, e.target.value)}
                placeholder={v.defaultValue || '0'}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            )}

            {v.type === 'textarea' && (
              <textarea
                value={values[v.name] || v.defaultValue}
                onChange={e => onChange(v.name, e.target.value)}
                placeholder={v.defaultValue}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            )}

            {(v.type === 'text' || !v.type) && (
              <input
                type="text"
                value={values[v.name] || v.defaultValue}
                onChange={e => onChange(v.name, e.target.value)}
                placeholder={v.defaultValue || `请输入 ${v.label}...`}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
