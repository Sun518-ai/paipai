'use client';

import { useState } from 'react';

export interface Variable {
  name: string;
  defaultValue: string;
  type: 'text' | 'color' | 'number' | 'textarea';
  label: string;
}

export function parseVariables(description: string): Variable[] {
  const regex = /\{\{([^}=]+)(?::([^}=]+))?(?:=([^}]*))?\}\}/g;
  const vars: Variable[] = [];
  let match;
  while ((match = regex.exec(description)) !== null) {
    const name = match[1].trim();
    const type = (match[2]?.trim() as Variable['type']) || 'text';
    const defaultValue = match[3]?.trim() || '';
    if (!vars.find(v => v.name === name)) {
      vars.push({ name, type, defaultValue, label: name });
    }
  }
  return vars;
}

interface VariableParserProps {
  description: string;
  onVariablesChange: (variables: Variable[]) => void;
}

export default function VariableParser({ description, onVariablesChange }: VariableParserProps) {
  const [manualVars, setManualVars] = useState<Variable[]>([]);
  const [showManual, setShowManual] = useState(false);
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<Variable['type']>('text');
  const [newVarDefault, setNewVarDefault] = useState('');

  const detected = parseVariables(description);
  const allVariables = [...detected, ...manualVars.filter(mv => !detected.find(d => d.name === mv.name))];

  const handleAddManual = () => {
    if (!newVarName.trim()) return;
    const newVar: Variable = { name: newVarName.trim(), type: newVarType, defaultValue: newVarDefault, label: newVarName.trim() };
    const updated = [...manualVars, newVar];
    setManualVars(updated);
    onVariablesChange([...detected, ...updated.filter(mv => !detected.find(d => d.name === mv.name))]);
    setNewVarName('');
    setNewVarDefault('');
  };

  const handleRemoveManual = (name: string) => {
    const updated = manualVars.filter(v => v.name !== name);
    setManualVars(updated);
    onVariablesChange([...detected, ...updated.filter(mv => !detected.find(d => d.name === mv.name))]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">🔍 变量解析</h3>
        <button
          onClick={() => setShowManual(!showManual)}
          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          {showManual ? '隐藏手动添加' : '+ 手动添加变量'}
        </button>
      </div>

      {allVariables.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-3">
          在描述中输入 <code className="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs">{'{{变量名}}'}</code> 格式来定义变量
        </p>
      ) : (
        <div className="space-y-2">
          {allVariables.map((v: Variable) => (
            <div key={v.name} className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                    {'{{'}{v.name}{'}}'}
                  </code>
                  {manualVars.find(mv => mv.name === v.name) && (
                    <span className="text-xs text-amber-500">手动</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 dark:text-slate-500 capitalize mt-0.5 block">
                  类型: {v.type === 'text' ? '文本' : v.type === 'color' ? '颜色' : v.type === 'number' ? '数字' : '多行文本'}
                </span>
              </div>
              {manualVars.find(mv => mv.name === v.name) && (
                <button onClick={() => handleRemoveManual(v.name)} className="text-gray-400 hover:text-red-400 dark:text-slate-500 dark:hover:text-red-400 transition-colors text-sm">
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showManual && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">添加自定义变量</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text" value={newVarName} onChange={e => setNewVarName(e.target.value)} placeholder="变量名"
              className="flex-1 min-w-[80px] px-2.5 py-1.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <select
              value={newVarType} onChange={e => setNewVarType(e.target.value as Variable['type'])}
              className="px-2 py-1.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="text">文本</option>
              <option value="color">颜色</option>
              <option value="number">数字</option>
              <option value="textarea">多行文本</option>
            </select>
            <input
              type={newVarType === 'color' ? 'color' : 'text'} value={newVarDefault} onChange={e => setNewVarDefault(e.target.value)} placeholder="默认值"
              className="w-24 px-2.5 py-1.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 focus:outline-none"
            />
            <button onClick={handleAddManual} className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
              添加
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
