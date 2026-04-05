'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { loadHybrid, saveHybrid } from '@/lib/localStore';
import { pushToCloud, mergeTodos, type SyncStatus, type Todo as SyncTodo } from '@/lib/todoSync';

type Priority = 'P0' | 'P1' | 'P2' | 'P3';
type RecurringType = 'none' | 'daily' | 'weekly' | 'monthly';

const PRIORITY_CONFIG: Record<Priority, { label: string; labelEn: string; color: string; emoji: string }> = {
  P0: { label: '紧急', labelEn: 'Urgent', color: '#EF4444', emoji: '🔴' },
  P1: { label: '高', labelEn: 'High', color: '#F97316', emoji: '🟠' },
  P2: { label: '中', labelEn: 'Medium', color: '#3B82F6', emoji: '🔵' },
  P3: { label: '低', labelEn: 'Low', color: '#9CA3AF', emoji: '⚪' },
};

const PRIORITY_ORDER: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

interface RecurringRule {
  type: RecurringType;
  dayOfWeek?: number;
  dayOfMonth?: number;
  lastGeneratedAt: number;
  seriesCreatedAt: number;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Todo {
  id: string;
  localId: string;
  recordId?: string;
  text: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  priority: Priority;
  dueDate?: number;
  recurring?: RecurringRule;
  completedAt?: number;
  tagIds: string[];
}

type Lang = 'zh' | 'en';
type Theme = 'light' | 'dark';

const DEFAULT_TAGS: Tag[] = [
  { id: 'tag-work', name: '工作', color: '#3b82f6' },
  { id: 'tag-urgent', name: '紧急', color: '#ef4444' },
  { id: 'tag-study', name: '学习', color: '#22c55e' },
];

const translations = {
  zh: {
    back: '← 返回点子站',
    title: 'TodoMVC',
    subtitle: '派派的待办事项管理',
    inputPlaceholder: '添加新任务... 按回车确认',
    addButton: '添加',
    filterAll: '全部',
    filterActive: '进行中',
    filterDone: '已完成',
    emptyAll: '还没有任务，添加一个吧！',
    emptyActive: '太棒了，所有任务都完成了！🎉',
    emptyDone: '还没有已完成的任务',
    emptyDueSoon: '没有即将到期的任务',
    filterDueSoon: '即将到期',
    delete: '删除',
    inProgress: '项进行中',
    completed: '项已完成',
    clearDone: '清除已完成',
    toggleLang: 'EN',
    toggleTheme: '深色模式',
    pin: '置顶',
    unpin: '取消置顶',
    setDueDate: '设定日期',
    clearDueDate: '清除日期',
    today: '今天',
    tomorrow: '明天',
    sortByDue: '按日期排序',
    sortByCreated: '按创建排序',
    recurring: '重复',
    recurringNone: '不重复',
    recurringDaily: '每日',
    recurringWeekly: '每周',
    recurringMonthly: '每月',
    recurringOn: '每',
    selectDayOfWeek: '选择星期',
    selectDayOfMonth: '选择日期',
    sun: '周日',
    mon: '周一',
    tue: '周二',
    wed: '周三',
    thu: '周四',
    fri: '周五',
    sat: '周六',
    day: '日',
    manageTags: '标签管理',
    addTag: '添加标签',
    editTag: '编辑标签',
    deleteTag: '删除标签',
    tagName: '标签名',
    tagColor: '颜色',
    noTags: '暂无标签',
    filterByTag: '按标签筛选',
    selectTags: '选择标签',
    close: '关闭',
    tagManageTitle: '标签管理',
    tagManageSubtitle: '增删改标签',
    tagNamePlaceholder: '例如：工作',
  },
  en: {
    back: '← Back to Ideas',
    title: 'TodoMVC',
    subtitle: "Paipai's Todo Manager",
    inputPlaceholder: 'Add a new task... Press Enter to confirm',
    addButton: 'Add',
    filterAll: 'All',
    filterActive: 'Active',
    filterDone: 'Done',
    emptyAll: 'No tasks yet, add one!',
    emptyActive: 'Amazing, all tasks completed! 🎉',
    emptyDone: 'No completed tasks yet',
    emptyDueSoon: 'No tasks due soon',
    filterDueSoon: 'Due Soon',
    delete: 'Delete',
    inProgress: ' active',
    completed: ' completed',
    clearDone: 'Clear Completed',
    toggleLang: '中',
    toggleTheme: 'Dark Mode',
    pin: 'Pin',
    unpin: 'Unpin',
    setDueDate: 'Set due date',
    clearDueDate: 'Clear date',
    today: 'Today',
    tomorrow: 'Tomorrow',
    sortByDue: 'Sort by due',
    sortByCreated: 'Sort by created',
    recurring: 'Repeat',
    recurringNone: 'No repeat',
    recurringDaily: 'Daily',
    recurringWeekly: 'Weekly',
    recurringMonthly: 'Monthly',
    recurringOn: 'Every ',
    selectDayOfWeek: 'Select day',
    selectDayOfMonth: 'Select date',
    sun: 'Sun',
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    day: '',
    manageTags: 'Manage Tags',
    addTag: 'Add Tag',
    editTag: 'Edit Tag',
    deleteTag: 'Delete Tag',
    tagName: 'Tag Name',
    tagColor: 'Color',
    noTags: 'No tags yet',
    filterByTag: 'Filter by tag',
    selectTags: 'Select Tags',
    close: 'Close',
    tagManageTitle: 'Tag Manager',
    tagManageSubtitle: 'Add, edit or delete tags',
    tagNamePlaceholder: 'e.g. Work',
  },
};

interface LangContextValue {
  lang: Lang;
  t: typeof translations.zh;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextValue>({ lang: 'zh', t: translations.zh, toggleLang: () => {} });
function useLang() { return useContext(LangContext); }

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', toggleTheme: () => {} });
function useTheme() { return useContext(ThemeContext); }

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const WEEKDAYS_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Types ───────────────────────────────────────────────────────────────────
type DueStatus = 'normal' | 'dueSoon' | 'overdue';

function getDueStatus(todo: Todo): DueStatus {
  if (todo.done || todo.dueDate === undefined || todo.dueDate === null) return 'normal';
  const diff = todo.dueDate - Date.now();
  if (diff < 0) return 'overdue';
  if (diff <= 24 * 60 * 60 * 1000) return 'dueSoon';
  return 'normal';
}

function formatDueDate(timestamp: number, lang: Lang): string {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const due = new Date(timestamp); due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((timestamp - now.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return translations[lang].today;
  if (diffDays === 1) return translations[lang].tomorrow;
  if (diffDays === -1) return lang === 'zh' ? '昨天' : 'Yesterday';
  return due.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
}

function getRecurringLabel(rule: RecurringRule, t: typeof translations.zh): string {
  switch (rule.type) {
    case 'daily': return t.recurringDaily;
    case 'weekly': return t.recurringOn + (t.sun.startsWith('S') ? WEEKDAYS_EN : WEEKDAYS_ZH)[rule.dayOfWeek ?? 0];
    case 'monthly': return t.recurringOn + rule.dayOfMonth + t.day;
    default: return '';
  }
}

// ─── RecurringSelector ────────────────────────────────────────────────────────
interface RecurringSelectorProps {
  value: RecurringType;
  dayOfWeek: number;
  dayOfMonth: number;
  onChange: (type: RecurringType, dayOfWeek: number, dayOfMonth: number) => void;
}

function RecurringSelector({ value, dayOfWeek, dayOfMonth, onChange }: RecurringSelectorProps) {
  const { t } = useLang();
  const [showOptions, setShowOptions] = useState(false);
  const options: { value: RecurringType; label: string }[] = [
    { value: 'none', label: t.recurringNone },
    { value: 'daily', label: t.recurringDaily },
    { value: 'weekly', label: t.recurringWeekly },
    { value: 'monthly', label: t.recurringMonthly },
  ];
  const weekDays = t.sun.startsWith('S') ? WEEKDAYS_EN : WEEKDAYS_ZH;

  return (
    <div className="relative">
      <button type="button" onClick={() => setShowOptions(!showOptions)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
        <span>🔁</span>
        <span>{options.find(o => o.value === value)?.label || t.recurringNone}</span>
      </button>
      {showOptions && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg p-2 min-w-48">
          {options.map(opt => (
            <button key={opt.value} onClick={() => { onChange(opt.value, dayOfWeek, dayOfMonth); setShowOptions(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${value === opt.value ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300' : 'text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
              {opt.label}
            </button>
          ))}
          {value === 'weekly' && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
              <p className="px-3 py-1 text-xs text-gray-400 dark:text-slate-500">{t.selectDayOfWeek}</p>
              <div className="flex flex-wrap gap-1 px-1">
                {weekDays.map((day, idx) => (
                  <button key={idx} onClick={() => onChange('weekly', idx, dayOfMonth)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${dayOfWeek === idx ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}
          {value === 'monthly' && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
              <p className="px-3 py-1 text-xs text-gray-400 dark:text-slate-500">{t.selectDayOfMonth}</p>
              <div className="flex flex-wrap gap-1 px-1 max-h-32 overflow-y-auto">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <button key={d} onClick={() => onChange('monthly', dayOfWeek, d)}
                    className={`w-8 h-8 text-xs rounded-md transition-colors ${dayOfMonth === d ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── RecurringBadge ───────────────────────────────────────────────────────────
function RecurringBadge({ rule }: { rule: RecurringRule }) {
  const { t } = useLang();
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <span className="text-indigo-500 dark:text-indigo-400 text-sm cursor-help" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>🔁</span>
      {showTooltip && <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-30">{getRecurringLabel(rule, t)}</div>}
    </div>
  );
}

// ─── DatePickerButton ────────────────────────────────────────────────────────
function DatePickerButton({ dueDate, onSet, t }: { dueDate: number | null | undefined; onSet: (ts: number | null) => void; t: typeof translations.zh }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) { onSet(null); return; }
    const date = new Date(val);
    date.setHours(23, 59, 59, 999);
    onSet(date.getTime());
  };
  const displayDate = dueDate !== null && dueDate !== undefined ? new Date(dueDate).toISOString().split('T')[0] : '';
  return (
    <div className="relative flex items-center">
      <button onClick={() => inputRef.current?.showPicker?.()}
        className={`text-sm transition-colors px-2 py-1 rounded-lg border ${dueDate !== null && dueDate !== undefined ? 'text-indigo-500 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30' : 'text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
        title={t.setDueDate}>📅</button>
      <input ref={inputRef} type="date" value={displayDate} onChange={handleChange} className="absolute opacity-0 w-0 h-0 pointer-events-none" tabIndex={-1} />
      {dueDate !== null && dueDate !== undefined && <button onClick={() => onSet(null)} className="text-gray-400 hover:text-red-400 dark:text-slate-500 dark:hover:text-red-400 transition-colors text-xs ml-1" title={t.clearDueDate}>✕</button>}
    </div>
  );
}

// ─── TagBadge ────────────────────────────────────────────────────────────────
function TagBadge({ tag, small = false }: { tag: Tag; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${small ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs'}`}
      style={{ backgroundColor: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}44` }}
    >
      {tag.name}
    </span>
  );
}

// ─── TagPicker ───────────────────────────────────────────────────────────────
function TagPicker({
  tags,
  selectedIds,
  onToggle,
  onClose,
}: {
  tags: Tag[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-80 border border-gray-100 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-gray-800 dark:text-slate-100 mb-3">{t.selectTags}</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => {
            const selected = selectedIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => onToggle(tag.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                style={selected
                  ? { backgroundColor: tag.color + '22', color: tag.color, border: `1.5px solid ${tag.color}` }
                  : { backgroundColor: tag.color + '15', color: tag.color, border: `1.5px solid ${tag.color}44` }
                }
              >
                <span>{tag.name}</span>
                {selected && <span>✓</span>}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TagManageModal ──────────────────────────────────────────────────────────
function TagManageModal({
  tags,
  onClose,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
}: {
  tags: Tag[];
  onClose: () => void;
  onAddTag: (tag: Tag) => void;
  onUpdateTag: (tag: Tag) => void;
  onDeleteTag: (id: string) => void;
}) {
  const { t } = useLang();
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3b82f6');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [showAdd, setShowAdd] = useState(false);

  const startEdit = (tag: Tag) => {
    setEditId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const saveEdit = () => {
    if (!editId || !editName.trim()) return;
    onUpdateTag({ id: editId, name: editName.trim(), color: editColor });
    setEditId(null);
  };

  const addNew = () => {
    if (!newName.trim()) return;
    onAddTag({ id: genId(), name: newName.trim(), color: newColor });
    setNewName('');
    setNewColor('#3b82f6');
    setShowAdd(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-[22rem] border border-gray-100 dark:border-slate-700 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-slate-100">{t.tagManageTitle}</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{t.tagManageSubtitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-xl">✕</button>
        </div>

        <div className="space-y-2 mb-4">
          {tags.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">{t.noTags}</p>
          )}
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-2">
              {editId === tag.id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button onClick={saveEdit} className="text-xs px-2 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">✓</button>
                  <button onClick={() => setEditId(null)} className="text-xs px-2 py-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">✕</button>
                </>
              ) : (
                <>
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                  <TagBadge tag={tag} />
                  <div className="ml-auto flex gap-1">
                    <button onClick={() => startEdit(tag)} className="text-xs px-2 py-1 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">✏️</button>
                    <button onClick={() => onDeleteTag(tag.id)} className="text-xs px-2 py-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">🗑️</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {showAdd ? (
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0"
            />
            <input
              type="text"
              placeholder={t.tagNamePlaceholder}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNew()}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button onClick={addNew} className="text-xs px-2 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">✓</button>
            <button onClick={() => setShowAdd(false)} className="text-xs px-2 py-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">✕</button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-2 text-sm text-indigo-500 dark:text-indigo-400 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            + {t.addTag}
          </button>
        )}
      </div>
    </div>
  );
}

export default function TodoMCVPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<Tag[]>(DEFAULT_TAGS);
  const [lang, setLang] = useState<Lang>('zh');
  const [theme, setTheme] = useState<Theme>('light');
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'dueSoon'>('all');
  const [priorityMenuOpen, setPriorityMenuOpen] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string>('');
  const [sortByDue, setSortByDue] = useState(false);
  const [recurringType, setRecurringType] = useState<RecurringType>('none');
  const [dayOfWeek, setDayOfWeek] = useState(new Date().getDay());
  const [dayOfMonth, setDayOfMonth] = useState(new Date().getDate());
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [showTagPicker, setShowTagPicker] = useState<string | null>(null);
  const [showTagManage, setShowTagManage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);
  const t = translations[lang];

  const applyTheme = (th: Theme) => { document.documentElement.dataset.theme = th; };

  // Load initial data: merge local + cloud
  useEffect(() => {
    loadHybrid<Lang>('paipai-todomcv-lang', 'zh').then((l) => setLang(l));

    // Load todos from local first, then try to merge with cloud
    loadHybrid<Todo[]>('paipai-todos', []).then(async (localTodos) => {
      // Migrate old todos without localId and without tagIds
      const migrated = localTodos.map((t) => ({
        ...t,
        localId: (t as SyncTodo).localId || t.id,
        updatedAt: (t as SyncTodo).updatedAt || t.createdAt,
        priority: (t as Todo).priority || 'P3' as Priority,
        dueDate: (t as Todo).dueDate ?? undefined,
        tagIds: (t as Todo).tagIds || [],
      }));

      if (!navigator.onLine) {
        setTodos(migrated);
        setSyncStatus('offline');
        return;
      }

      setSyncStatus('syncing');
      try {
        const res = await fetch('/api/todos/sync', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json() as { ok: boolean; todos: Todo[]; error?: string };
        if (!json.ok) throw new Error(json.error || 'unknown error');
        const merged = mergeTodos(migrated, json.todos || []);
        saveHybrid('paipai-todos', merged);
        setTodos(merged);
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } catch (e) {
        console.warn('[todoSync] initial load failed, using local:', e);
        setTodos(migrated);
        setSyncStatus('error');
        setSyncError(String(e));
      }
    });

    // Load tags
    loadHybrid<Tag[]>('paipai-tags', DEFAULT_TAGS).then((loadedTags) => {
      const merged = [...DEFAULT_TAGS];
      loadedTags.forEach((lt) => {
        if (!merged.find((d) => d.id === lt.id)) merged.push(lt);
      });
      setTags(merged);
    });

    const storedTheme = localStorage.getItem('paipai-todomcv-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') { setTheme(storedTheme); applyTheme(storedTheme); }
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolved = prefersDark ? 'dark' : 'light';
      setTheme(resolved);
      applyTheme(resolved);
    }
  }, []);

  useEffect(() => {
    const storedTheme = localStorage.getItem('paipai-todomcv-theme');
    if (storedTheme !== null && storedTheme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => { const resolved = e.matches ? 'dark' : 'light'; setTheme(resolved); applyTheme(resolved); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Debounced sync to cloud when todos change
  useEffect(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      if (!navigator.onLine || syncingRef.current) return;
      syncingRef.current = true;
      setSyncStatus('syncing');
      const ok = await pushToCloud(todos);
      syncingRef.current = false;
      if (ok) {
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } else {
        setSyncStatus('error');
      }
    }, 500);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [todos]);

  // Online/offline listener
  useEffect(() => {
    const handleOnline = async () => {
      setSyncStatus('syncing');
      const ok = await pushToCloud(todos);
      if (ok) {
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } else {
        setSyncStatus('error');
      }
    };
    const handleOffline = () => setSyncStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [todos]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    saveHybrid('paipai-todos', todos);
  }, [todos]);

  useEffect(() => {
    saveHybrid('paipai-todomcv-lang', lang);
  }, [lang]);

  useEffect(() => {
    saveHybrid('paipai-todomcv-theme', theme);
  }, [theme]);

  useEffect(() => {
    saveHybrid('paipai-tags', tags);
  }, [tags]);

  const toggleLang = () => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'));
  const toggleTheme = () => { setTheme((prev) => { const next = prev === 'light' ? 'dark' : 'light'; applyTheme(next); return next; }); };
  const handleRecurringChange = (type: RecurringType, dow: number, dom: number) => { setRecurringType(type); setDayOfWeek(dow); setDayOfMonth(dom); };

  const addTodo = () => {
    const text = input.trim();
    if (!text) return;
    const now = Date.now();
    const id = genId();
    const newTodo: Todo = {
      id,
      localId: id,
      text,
      done: false,
      pinned: false,
      createdAt: now,
      updatedAt: now,
      priority: 'P3' as Priority,
      dueDate: undefined,
      tagIds: [],
    };
    if (recurringType !== 'none') {
      newTodo.recurring = {
        type: recurringType,
        dayOfWeek: recurringType === 'weekly' ? dayOfWeek : undefined,
        dayOfMonth: recurringType === 'monthly' ? dayOfMonth : undefined,
        lastGeneratedAt: now,
        seriesCreatedAt: now
      };
    }
    setTodos((prev) => [newTodo, ...prev]);
    setInput('');
    setRecurringType('none');
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;
      // Handle recurring task completion - generate next occurrence
      if (!task.done && task.recurring && task.recurring.type !== 'none') {
        const now = Date.now();
        const newTask: Todo = {
          id: genId(),
          text: task.text,
          done: false,
          pinned: false,
          createdAt: now,
          updatedAt: now,
          priority: task.priority,
          dueDate: undefined,
          recurring: { ...task.recurring, lastGeneratedAt: now, seriesCreatedAt: task.recurring.seriesCreatedAt },
          tagIds: task.tagIds,
        };
        return [...prev.map((t) => t.id === id ? { ...t, done: true, completedAt: now, updatedAt: now } : t), newTask];
      }
      return prev.map((t) => t.id === id ? { ...t, done: !t.done, updatedAt: Date.now() } : t);
    });
  };

  const togglePin = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned, updatedAt: Date.now() } : t))
    );
  };

  const setPriority = (id: string, p: Priority) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, priority: p, updatedAt: Date.now() } : t))
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const clearDone = () => {
    setTodos((prev) => prev.filter((t) => !t.done));
  };

  const setDueDate = (id: string, timestamp: number | null) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, dueDate: timestamp ?? undefined, updatedAt: Date.now() } : t));
  };

  const toggleTodoTag = (todoId: string, tagId: string) => {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id !== todoId) return t;
        const has = t.tagIds.includes(tagId);
        return { ...t, tagIds: has ? t.tagIds.filter((id) => id !== tagId) : [...t.tagIds, tagId] };
      })
    );
  };

  const addTag = (tag: Tag) => {
    setTags((prev) => [...prev, tag]);
  };

  const updateTag = (tag: Tag) => {
    setTags((prev) => prev.map((tg) => (tg.id === tag.id ? tag : tg)));
  };

  const deleteTag = (tagId: string) => {
    setTags((prev) => prev.filter((tg) => tg.id !== tagId));
    setTodos((prev) =>
      prev.map((t) => ({ ...t, tagIds: t.tagIds.filter((id) => id !== tagId) }))
    );
    if (selectedTagId === tagId) setSelectedTagId(null);
  };

  const filtered = todos
    .filter((t) => {
      if (filter === 'active') return !t.done;
      if (filter === 'done') return t.done;
      return true;
    })
    .filter((t) => {
      if (selectedTagId) return t.tagIds.includes(selectedTagId);
      return true;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.priority !== b.priority) {
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }
      if (sortByDue) {
        const statusOrder: Record<DueStatus, number> = { overdue: 0, dueSoon: 1, normal: 2 };
        if (a.dueDate === undefined && b.dueDate !== undefined) return 1;
        if (b.dueDate === undefined && a.dueDate !== undefined) return -1;
        if (a.dueDate === undefined) return b.createdAt - a.createdAt;
        const statusA = getDueStatus(a); const statusB = getDueStatus(b);
        if (statusA !== statusB) return statusOrder[statusA] - statusOrder[statusB];
        return (a.dueDate as number) - (b.dueDate as number);
      }
      const statusA = getDueStatus(a); const statusB = getDueStatus(b);
      if (statusA === 'overdue' && statusB !== 'overdue') return -1;
      if (statusB === 'overdue' && statusA !== 'overdue') return 1;
      if (statusA === 'dueSoon' && statusB === 'normal') return -1;
      if (statusB === 'dueSoon' && statusA === 'normal') return 1;
      if (a.dueDate !== undefined && b.dueDate !== undefined) return a.dueDate - b.dueDate;
      if (a.dueDate !== undefined) return -1;
      if (b.dueDate !== undefined) return 1;
      return b.createdAt - a.createdAt;
    });

  const activeCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - activeCount;
  const dueSoonCount = todos.filter((t) => getDueStatus(t) === 'dueSoon').length;

  const getTagById = (id: string) => tags.find((tag) => tag.id === id);

  const bgStyle = { background: `linear-gradient(to bottom right, var(--bg-gradient-start), var(--bg-gradient-mid), var(--bg-gradient-end))` };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <LangContext.Provider value={{ lang, t, toggleLang }}>
        <div className="min-h-screen" style={bgStyle}>
          {/* Back link + controls row */}
          <div className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-end gap-2">
            <Link
              href="/"
              className="mr-auto inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium transition-colors"
            >
              {t.back}
            </Link>
            <button
              onClick={() => setShowTagManage(true)}
              className="px-3 py-1 text-xs font-medium text-indigo-500 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
              title={t.manageTags}
            >
              🏷️ {t.manageTags}
            </button>
            <button
              onClick={toggleTheme}
              aria-label={theme === 'light' ? '切换到深色模式' : 'Switch to light mode'}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/60 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-600 transition-all text-lg"
              title={theme === 'light' ? '深色模式' : 'Light Mode'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button
              onClick={toggleLang}
              className="px-3 py-1 text-xs font-medium text-indigo-500 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
            >
              {t.toggleLang}
            </button>
            {/* Sync status indicator */}
            <div className="flex items-center gap-1 text-xs min-w-[80px] justify-end">
              {syncStatus === 'syncing' && (
                <span className="text-indigo-500 dark:text-indigo-400">🔄 同步中</span>
              )}
              {syncStatus === 'synced' && (
                <span className="text-green-500 dark:text-green-400">✅ 已同步</span>
              )}
              {syncStatus === 'offline' && (
                <span className="text-amber-500 dark:text-amber-400">⚠️ 离线</span>
              )}
              {syncStatus === 'error' && (
                <span
                  className="text-red-500 dark:text-red-400 cursor-help"
                  title={syncError}
                >
                  ❌ 同步失败
                </span>
              )}
            </div>
          </div>
          <div className="max-w-2xl mx-auto px-6 py-10">
            {/* Title */}
            <div className="text-center mb-8">
              <span className="text-5xl mb-3 block">✅</span>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
              <p className="text-gray-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
            </div>

            {/* Tag Filter Bar */}
            {tags.length > 0 && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs text-gray-400 dark:text-slate-500 mr-1">{t.filterByTag}:</span>
                <button
                  onClick={() => setSelectedTagId(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!selectedTagId ? 'bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-800' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                >
                  {t.filterAll}
                </button>
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                    style={selectedTagId === tag.id
                      ? { backgroundColor: tag.color + '22', color: tag.color, border: `1.5px solid ${tag.color}` }
                      : { backgroundColor: tag.color + '15', color: tag.color, border: `1.5px solid ${tag.color}44` }
                    }
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 mb-6">
              <div className="flex gap-2">
                <input ref={inputRef} type="text" placeholder={t.inputPlaceholder} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                  className="flex-1 px-4 py-3 text-lg border border-gray-200 dark:border-slate-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500" />
                <button onClick={addTodo} className="px-6 py-3 bg-indigo-500 dark:bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors shadow-sm">{t.addButton}</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-slate-400">{t.recurring}:</span>
                <RecurringSelector value={recurringType} dayOfWeek={dayOfWeek} dayOfMonth={dayOfMonth} onChange={handleRecurringChange} />
              </div>
            </div>
            <div className="flex items-center justify-end mb-3">
              <button onClick={() => setSortByDue((prev) => !prev)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${sortByDue ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400' : 'bg-white/60 dark:bg-slate-800/60 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-indigo-300'}`}>
                {sortByDue ? t.sortByDue : t.sortByCreated}
              </button>
            </div>
            <div className="flex items-center gap-1 mb-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-1">
              {(['all', 'active', 'done', 'dueSoon'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-indigo-500 dark:bg-indigo-600 text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
                  {f === 'all' ? t.filterAll : f === 'active' ? t.filterActive : f === 'done' ? t.filterDone : t.filterDueSoon}
                  {f === 'all' && ` (${todos.length})`}{f === 'active' && ` (${activeCount})`}{f === 'done' && ` (${doneCount})`}{f === 'dueSoon' && ` (${dueSoonCount})`}
                </button>
              ))}
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-2">{filter === 'dueSoon' ? '🎉' : '📝'}</p>
                  <p className="text-gray-400 dark:text-slate-500">{filter === 'all' ? t.emptyAll : filter === 'active' ? t.emptyActive : filter === 'done' ? t.emptyDone : t.emptyDueSoon}</p>
                </div>
              ) : (
                <ul>
                  {filtered.map((todo, idx) => {
                    const dueStatus = getDueStatus(todo);
                    const isOverdue = dueStatus === 'overdue';
                    const isDueSoon = dueStatus === 'dueSoon';
                    const todoTags = todo.tagIds.map(getTagById).filter(Boolean) as Tag[];
                    return (
                      <li key={todo.id}
                        className={`flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${idx !== filtered.length - 1 ? 'border-b border-gray-50 dark:border-slate-700/50' : ''} ${isOverdue && !todo.done ? 'bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-500' : isDueSoon && !todo.done ? 'bg-amber-50 dark:bg-amber-900/10 border-l-4 border-l-amber-400' : ''}`}>
                        <button onClick={() => toggleTodo(todo.id)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${todo.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-slate-500 hover:border-indigo-400 dark:hover:border-indigo-400'}`}>
                          {todo.done && '✓'}
                        </button>
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          {todo.recurring && todo.recurring.type !== 'none' && <RecurringBadge rule={todo.recurring} />}
                          <div className="min-w-0 flex-1">
                            <span className={`text-lg transition-all block truncate ${todo.done ? 'text-gray-400 dark:text-slate-500 line-through' : isOverdue ? 'text-red-600 dark:text-red-400' : isDueSoon ? 'text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-slate-100'}`}>{todo.text}</span>
                            {todo.dueDate !== undefined && <span className={`text-xs mt-0.5 block ${todo.done ? 'text-gray-400 dark:text-slate-500' : isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : isDueSoon ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-slate-500'}`}>{isOverdue && '⚠️ '}{isDueSoon && '📅 '}{formatDueDate(todo.dueDate, lang)}</span>}
                            {todoTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {todoTags.map((tag) => (
                                  <TagBadge key={tag.id} tag={tag} small />
                                ))}
                              </div>
                            )}
                          </div>
                          {todo.done && todo.recurring && todo.recurring.type !== 'none' && <span className="text-green-500 flex-shrink-0" title="Next occurrence generated">✨</span>}
                        </div>
                        <button onClick={() => setShowTagPicker(todo.id)} className="text-gray-300 dark:text-slate-600 hover:text-indigo-400 dark:hover:text-indigo-400 transition-colors text-sm" title={t.selectTags}>🏷️</button>
                        <DatePickerButton dueDate={todo.dueDate} onSet={(ts) => setDueDate(todo.id, ts)} t={t} />
                        <button onClick={() => togglePin(todo.id)} className={`text-base transition-colors ${todo.pinned ? 'text-amber-400 hover:text-amber-600' : 'text-gray-300 hover:text-amber-400'}`} title={todo.pinned ? t.unpin : t.pin}>📌</button>
                        <button onClick={() => deleteTodo(todo.id)} className="text-gray-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 transition-colors text-sm" title={t.delete}>🗑️</button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            {todos.length > 0 && (
              <div className="flex items-center justify-between mt-4 text-sm text-gray-400 dark:text-slate-500 px-1">
                <span>{activeCount} {t.inProgress} · {doneCount} {t.completed}</span>
                {doneCount > 0 && <button onClick={clearDone} className="hover:text-red-500 dark:hover:text-red-400 transition-colors">{t.clearDone}</button>}
              </div>
            )}
          </div>
        </div>

        {showTagPicker && (
          <TagPicker
            tags={tags}
            selectedIds={todos.find((t) => t.id === showTagPicker)?.tagIds || []}
            onToggle={(tagId) => toggleTodoTag(showTagPicker, tagId)}
            onClose={() => setShowTagPicker(null)}
          />
        )}

        {showTagManage && (
          <TagManageModal
            tags={tags}
            onClose={() => setShowTagManage(false)}
            onAddTag={addTag}
            onUpdateTag={updateTag}
            onDeleteTag={deleteTag}
          />
        )}
      </LangContext.Provider>
    </ThemeContext.Provider>
  );
}
