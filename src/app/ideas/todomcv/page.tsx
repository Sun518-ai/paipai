'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { loadHybrid, saveHybrid } from '@/lib/localStore';

interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  pinned: boolean;
  dueDate: number | null;
}

type Lang = 'zh' | 'en';
type Theme = 'light' | 'dark';
type DueStatus = 'normal' | 'dueSoon' | 'overdue';

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
    filterDueSoon: '即将到期',
    emptyAll: '还没有任务，添加一个吧！',
    emptyActive: '太棒了，所有任务都完成了！🎉',
    emptyDone: '还没有已完成的任务',
    emptyDueSoon: '🎉 没有即将到期的任务',
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
    filterDueSoon: 'Due Soon',
    emptyAll: 'No tasks yet, add one!',
    emptyActive: 'Amazing, all tasks completed! 🎉',
    emptyDone: 'No completed tasks yet',
    emptyDueSoon: '🎉 No tasks due soon',
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
  },
};

interface LangContextValue {
  lang: Lang;
  t: typeof translations.zh;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextValue>({
  lang: 'zh',
  t: translations.zh,
  toggleLang: () => {},
});

function useLang() {
  return useContext(LangContext);
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
});

function useTheme() {
  return useContext(ThemeContext);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getDueStatus(todo: Todo): DueStatus {
  if (todo.done || todo.dueDate === null) return 'normal';
  const now = Date.now();
  const diff = todo.dueDate - now;
  if (diff < 0) return 'overdue';
  if (diff <= 24 * 60 * 60 * 1000) return 'dueSoon';
  return 'normal';
}

function formatDueDate(timestamp: number, lang: Lang): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(timestamp);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((timestamp - now.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return translations[lang].today;
  if (diffDays === 1) return translations[lang].tomorrow;
  if (diffDays === -1) return lang === 'zh' ? '昨天' : 'Yesterday';

  return due.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function TodoMCVPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [lang, setLang] = useState<Lang>('zh');
  const [theme, setTheme] = useState<Theme>('light');
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'dueSoon'>('all');
  const [sortByDue, setSortByDue] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];

  const applyTheme = (th: Theme) => {
    document.documentElement.dataset.theme = th;
  };

  useEffect(() => {
    loadHybrid<Lang>('paipai-todomcv-lang', 'zh').then((l) => setLang(l));
    loadHybrid<Todo[]>('paipai-todos', []).then((todos) => {
      setTodos(
        todos.map((t) => ({
          ...t,
          dueDate: (t as Todo).dueDate ?? null,
        }))
      );
    });
    const storedTheme = localStorage.getItem('paipai-todomcv-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
      applyTheme(storedTheme);
    } else {
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
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light';
      setTheme(resolved);
      applyTheme(resolved);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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

  const toggleLang = () => {
    setLang((prev) => (prev === 'zh' ? 'en' : 'zh'));
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      applyTheme(next);
      return next;
    });
  };

  const addTodo = () => {
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [
      { id: genId(), text, done: false, pinned: false, createdAt: Date.now(), dueDate: null },
      ...prev,
    ]);
    setInput('');
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const togglePin = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t))
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const clearDone = () => {
    setTodos((prev) => prev.filter((t) => !t.done));
  };

  const setDueDate = (id: string, timestamp: number | null) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, dueDate: timestamp } : t))
    );
  };

  const filtered = todos
    .filter((t) => {
      if (filter === 'active') return !t.done;
      if (filter === 'done') return t.done;
      if (filter === 'dueSoon') return getDueStatus(t) === 'dueSoon';
      return true;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      if (sortByDue) {
        const statusA = getDueStatus(a);
        const statusB = getDueStatus(b);
        const statusOrder: Record<DueStatus, number> = { overdue: 0, dueSoon: 1, normal: 2 };

        if (a.dueDate === null && b.dueDate !== null) return 1;
        if (b.dueDate === null && a.dueDate !== null) return -1;
        if (a.dueDate === null && b.dueDate === null) return b.createdAt - a.createdAt;

        if (statusA !== statusB) return statusOrder[statusA] - statusOrder[statusB];
        return (a.dueDate as number) - (b.dueDate as number);
      }

      const statusA = getDueStatus(a);
      const statusB = getDueStatus(b);

      if (statusA === 'overdue' && statusB !== 'overdue') return -1;
      if (statusB === 'overdue' && statusA !== 'overdue') return 1;

      if (statusA === 'dueSoon' && statusB === 'normal') return -1;
      if (statusB === 'dueSoon' && statusA === 'normal') return 1;

      if (a.dueDate !== null && b.dueDate !== null) return a.dueDate - b.dueDate;
      if (a.dueDate !== null) return -1;
      if (b.dueDate !== null) return 1;

      return b.createdAt - a.createdAt;
    });

  const activeCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - activeCount;
  const dueSoonCount = todos.filter((t) => getDueStatus(t) === 'dueSoon').length;

  const langValue = { lang, t, toggleLang };
  const themeValue = { theme, toggleTheme };

  const bgStyle = {
    background: `linear-gradient(to bottom right, var(--bg-gradient-start), var(--bg-gradient-mid), var(--bg-gradient-end))`,
  };

  return (
    <ThemeContext.Provider value={themeValue}>
      <LangContext.Provider value={langValue}>
        <div className="min-h-screen" style={bgStyle}>
          <div className="max-w-2xl mx-auto px-6 pt-8 flex items-center justify-end gap-2">
            <Link
              href="/"
              className="mr-auto inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium transition-colors"
            >
              {t.back}
            </Link>
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
          </div>

          <div className="max-w-2xl mx-auto px-6 py-10">
            <div className="text-center mb-8">
              <span className="text-5xl mb-3 block">✅</span>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
              <p className="text-gray-500 dark:text-slate-400 mt-1">{t.subtitle}</p>
            </div>

            <div className="flex gap-2 mb-6">
              <input
                ref={inputRef}
                type="text"
                placeholder={t.inputPlaceholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                className="flex-1 px-4 py-3 text-lg border border-gray-200 dark:border-slate-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
              />
              <button
                onClick={addTodo}
                className="px-6 py-3 bg-indigo-500 dark:bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors shadow-sm"
              >
                {t.addButton}
              </button>
            </div>

            <div className="flex items-center justify-end mb-3">
              <button
                onClick={() => setSortByDue((prev) => !prev)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  sortByDue
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                    : 'bg-white/60 dark:bg-slate-800/60 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-indigo-300'
                }`}
              >
                {sortByDue ? t.sortByDue : t.sortByCreated}
              </button>
            </div>

            <div className="flex items-center gap-1 mb-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-1">
              {(['all', 'active', 'done', 'dueSoon'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-indigo-500 dark:bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                  }`}
                >
                  {f === 'all' ? t.filterAll : f === 'active' ? t.filterActive : f === 'done' ? t.filterDone : t.filterDueSoon}
                  {f === 'all' && ` (${todos.length})`}
                  {f === 'active' && ` (${activeCount})`}
                  {f === 'done' && ` (${doneCount})`}
                  {f === 'dueSoon' && ` (${dueSoonCount})`}
                </button>
              ))}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-2">{filter === 'dueSoon' ? '🎉' : '📝'}</p>
                  <p className="text-gray-400 dark:text-slate-500">
                    {filter === 'all'
                      ? t.emptyAll
                      : filter === 'active'
                      ? t.emptyActive
                      : filter === 'done'
                      ? t.emptyDone
                      : t.emptyDueSoon}
                  </p>
                </div>
              ) : (
                <ul>
                  {filtered.map((todo, idx) => {
                    const dueStatus = getDueStatus(todo);
                    const isOverdue = dueStatus === 'overdue';
                    const isDueSoon = dueStatus === 'dueSoon';

                    return (
                      <li
                        key={todo.id}
                        className={`flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${
                          idx !== filtered.length - 1
                            ? 'border-b border-gray-50 dark:border-slate-700/50'
                            : ''
                        } ${
                          isOverdue && !todo.done
                            ? 'bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-500'
                            : isDueSoon && !todo.done
                            ? 'bg-amber-50 dark:bg-amber-900/10 border-l-4 border-l-amber-400'
                            : ''
                        }`}
                      >
                        <button
                          onClick={() => toggleTodo(todo.id)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            todo.done
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 dark:border-slate-500 hover:border-indigo-400 dark:hover:border-indigo-400'
                          }`}
                        >
                          {todo.done && '✓'}
                        </button>

                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-lg transition-all block truncate ${
                              todo.done
                                ? 'text-gray-400 dark:text-slate-500 line-through'
                                : isOverdue
                                ? 'text-red-600 dark:text-red-400'
                                : isDueSoon
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-gray-800 dark:text-slate-100'
                            }`}
                          >
                            {todo.text}
                          </span>
                          {todo.dueDate !== null && (
                            <span
                              className={`text-xs mt-0.5 block ${
                                todo.done
                                  ? 'text-gray-400 dark:text-slate-500'
                                  : isOverdue
                                  ? 'text-red-500 dark:text-red-400 font-medium'
                                  : isDueSoon
                                  ? 'text-amber-500 dark:text-amber-400'
                                  : 'text-gray-400 dark:text-slate-500'
                              }`}
                            >
                              {isOverdue && '⚠️ '}
                              {isDueSoon && '📅 '}
                              {formatDueDate(todo.dueDate, lang)}
                            </span>
                          )}
                        </div>

                        <DatePickerButton
                          dueDate={todo.dueDate}
                          onSet={(ts) => setDueDate(todo.id, ts)}
                          lang={lang}
                          t={t}
                        />

                        <button
                          onClick={() => togglePin(todo.id)}
                          className={`text-base transition-colors ${
                            todo.pinned
                              ? 'text-amber-400 hover:text-amber-600'
                              : 'text-gray-300 hover:text-amber-400'
                          }`}
                          title={todo.pinned ? t.unpin : t.pin}
                        >
                          📌
                        </button>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="text-gray-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 transition-colors text-sm"
                          title={t.delete}
                        >
                          🗑️
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {todos.length > 0 && (
              <div className="flex items-center justify-between mt-4 text-sm text-gray-400 dark:text-slate-500 px-1">
                <span>
                  {activeCount} {t.inProgress} · {doneCount} {t.completed}
                </span>
                {doneCount > 0 && (
                  <button
                    onClick={clearDone}
                    className="hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    {t.clearDone}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </LangContext.Provider>
    </ThemeContext.Provider>
  );
}

interface DatePickerButtonProps {
  dueDate: number | null;
  onSet: (ts: number | null) => void;
  lang: Lang;
  t: typeof translations.zh;
}

function DatePickerButton({ dueDate, onSet, lang, t }: DatePickerButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      onSet(null);
      return;
    }
    const date = new Date(val);
    date.setHours(23, 59, 59, 999);
    onSet(date.getTime());
  };

  const openPicker = () => {
    inputRef.current?.showPicker?.();
  };

  const displayDate =
    dueDate !== null ? new Date(dueDate).toISOString().split('T')[0] : '';

  return (
    <div className="relative flex items-center">
      <button
        onClick={openPicker}
        className={`text-sm transition-colors px-2 py-1 rounded-lg border ${
          dueDate !== null
            ? 'text-indigo-500 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
            : 'text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700'
        }`}
        title={t.setDueDate}
      >
        📅
      </button>
      <input
        ref={inputRef}
        type="date"
        value={displayDate}
        onChange={handleChange}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        tabIndex={-1}
      />
      {dueDate !== null && (
        <button
          onClick={() => onSet(null)}
          className="text-gray-400 hover:text-red-400 dark:text-slate-500 dark:hover:text-red-400 transition-colors text-xs ml-1"
          title={t.clearDueDate}
        >
          ✕
        </button>
      )}
    </div>
  );
}
