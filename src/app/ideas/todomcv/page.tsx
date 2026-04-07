'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { loadHybrid, saveHybrid } from '@/lib/localStore';
import { pushToCloud, mergeTodos, type SyncStatus, type Todo as SyncTodo } from '@/lib/todoSync';
import TodoChat from '@/components/TodoChat';

type Priority = 'P0' | 'P1' | 'P2' | 'P3';

interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  pinned: boolean;
  priority: Priority;
  dueDate: number | null;
}

type Lang = 'zh' | 'en';
type Theme = 'light' | 'dark';

const PRIORITY_CONFIG: Record<Priority, { label: string; labelEn: string; color: string; emoji: string }> = {
  P0: { label: '紧急', labelEn: 'Urgent',  color: '#EF4444', emoji: '🔴' },
  P1: { label: '高',   labelEn: 'High',    color: '#F97316', emoji: '🟠' },
  P2: { label: '中',   labelEn: 'Medium',  color: '#3B82F6', emoji: '🔵' },
  P3: { label: '低',   labelEn: 'Low',     color: '#9CA3AF', emoji: '⚪' },
};

const PRIORITY_ORDER: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

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
    delete: '删除',
    inProgress: '项进行中',
    completed: '项已完成',
    clearDone: '清除已完成',
    toggleLang: 'EN',
    toggleTheme: '深色模式',
    pin: '置顶',
    unpin: '取消置顶',
    priority: '优先级',
    priorityUrgent: '紧急',
    priorityHigh: '高',
    priorityMedium: '中',
    priorityLow: '低',
    setDueDate: '设定日期',
    clearDueDate: '清除日期',
    filterDueSoon: '即将到期',
    emptyDueSoon: '🎉 没有即将到期的任务',
    today: '今天',
    tomorrow: '明天',
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
    delete: 'Delete',
    inProgress: ' active',
    completed: ' completed',
    clearDone: 'Clear Completed',
    toggleLang: '中',
    toggleTheme: 'Dark Mode',
    pin: 'Pin',
    unpin: 'Unpin',
    priority: 'Priority',
    priorityUrgent: 'Urgent',
    priorityHigh: 'High',
    priorityMedium: 'Medium',
    priorityLow: 'Low',
    setDueDate: 'Set due date',
    clearDueDate: 'Clear date',
    filterDueSoon: 'Due Soon',
    emptyDueSoon: '🎉 No tasks due soon',
    today: 'Today',
    tomorrow: 'Tomorrow',
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

function DeleteConfirmDialog({
  todoText,
  onConfirm,
  onCancel,
}: {
  todoText: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const truncated = todoText.length > 30 ? todoText.slice(0, 30) + '...' : todoText;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-600 w-full max-w-sm mx-4 overflow-hidden"
      >
        <div className="px-6 py-5">
          <h3 className="text-lg font-semibold text-red-500 mb-2">确认删除</h3>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            确定要删除这个任务吗？
          </p>
          <p className="mt-2 text-sm text-gray-800 dark:text-slate-100 font-medium bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2 truncate">
            {truncated}
          </p>
        </div>
        <div className="flex border-t border-gray-100 dark:border-slate-700">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

type DueStatus = 'normal' | 'dueSoon' | 'overdue';

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
  const today = now.getTime();
  const tomorrow = today + 24 * 60 * 60 * 1000;
  const diffDays = Math.round((timestamp - today) / (24 * 60 * 60 * 1000));

  if (timestamp >= today && timestamp < tomorrow) return translations[lang].today;
  if (timestamp >= tomorrow && timestamp < tomorrow + 24 * 60 * 60 * 1000) return translations[lang].tomorrow;
  if (diffDays === -1) return lang === 'zh' ? '昨天' : 'Yesterday';

  const date = new Date(timestamp);
  return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
}

function PrioritySelector({
  todoId,
  currentPriority,
  onSelect,
  onClose,
}: {
  todoId: string;
  currentPriority: Priority;
  onSelect: (id: string, p: Priority) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { lang, t } = useLang();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const priorityLabels: Record<Priority, string> = {
    P0: t.priorityUrgent,
    P1: t.priorityHigh,
    P2: t.priorityMedium,
    P3: t.priorityLow,
  };

  return (
    <div
      ref={ref}
      className="absolute right-16 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg py-1 min-w-[120px]"
    >
      {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
        <button
          key={p}
          onClick={() => {
            onSelect(todoId, p);
            onClose();
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
            currentPriority === p ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
          }`}
        >
          <span style={{ color: PRIORITY_CONFIG[p].color }}>{PRIORITY_CONFIG[p].emoji}</span>
          <span className="text-gray-700 dark:text-slate-200">{priorityLabels[p]}</span>
        </button>
      ))}
    </div>
  );
}

export default function TodoMCVPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [lang, setLang] = useState<Lang>('zh');
  const [theme, setTheme] = useState<Theme>('light');
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'dueSoon'>('all');
  const [priorityMenuOpen, setPriorityMenuOpen] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];

  const applyTheme = (th: Theme) => {
    document.documentElement.dataset.theme = th;
  };

  useEffect(() => {
    loadHybrid<Lang>('paipai-todomcv-lang', 'zh').then((l) => setLang(l));
    loadHybrid<Todo[]>('paipai-todos', []).then(setTodos);
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
      { id: genId(), text, done: false, pinned: false, createdAt: Date.now(), priority: 'P3' as Priority, dueDate: null },
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

  const setPriority = (id: string, p: Priority) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, priority: p } : t))
    );
  };

  const setDueDate = (id: string, dueDate: number | null) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, dueDate } : t))
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const confirmDelete = (id: string, text: string) => {
    setDeleteConfirm({ id, text });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      deleteTodo(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const clearDone = () => {
    setTodos((prev) => prev.filter((t) => !t.done));
  };

  const filtered = todos
    .filter((t) => {
      if (filter === 'active') return !t.done;
      if (filter === 'done') return t.done;
      if (filter === 'dueSoon') return !t.done && getDueStatus(t) === 'dueSoon';
      return true;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.priority !== b.priority) {
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }
      return b.createdAt - a.createdAt;
    });

  const activeCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - activeCount;
  const dueSoonCount = todos.filter((t) => !t.done && getDueStatus(t) === 'dueSoon').length;

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
                  <p className="text-4xl mb-2">📝</p>
                  <p className="text-gray-400 dark:text-slate-500">
                    {filter === 'all'
                      ? t.emptyAll
                      : filter === 'active'
                      ? t.emptyActive
                      : filter === 'dueSoon'
                      ? t.emptyDueSoon
                      : t.emptyDone}
                  </p>
                </div>
              ) : (
                <ul>
                  {filtered.map((todo, idx) => (
                    <li
                      key={todo.id}
                      className={`relative flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${
                        idx !== filtered.length - 1
                          ? 'border-b border-gray-50 dark:border-slate-700/50'
                          : ''
                      } ${getDueStatus(todo) === 'overdue' ? 'bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-500' : getDueStatus(todo) === 'dueSoon' ? 'bg-amber-50 dark:bg-amber-900/10 border-l-4 border-l-amber-400' : todo.priority === 'P0' ? 'border-l-4 border-red-500' : ''}`}
                    >
                      <button
                        onClick={() =>
                          setPriorityMenuOpen(priorityMenuOpen === todo.id ? null : todo.id)
                        }
                        className="relative flex-shrink-0 transition-transform hover:scale-110"
                        style={{ color: PRIORITY_CONFIG[todo.priority].color }}
                        title={t.priority}
                      >
                        {PRIORITY_CONFIG[todo.priority].emoji}
                      </button>

                      {priorityMenuOpen === todo.id && (
                        <PrioritySelector
                          todoId={todo.id}
                          currentPriority={todo.priority}
                          onSelect={setPriority}
                          onClose={() => setPriorityMenuOpen(null)}
                        />
                      )}

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

                      <span
                        className={`flex-1 text-lg transition-all ${
                          todo.done
                            ? 'text-gray-400 dark:text-slate-500 line-through'
                            : todo.priority === 'P0'
                            ? 'text-gray-800 dark:text-slate-100 font-semibold'
                            : 'text-gray-800 dark:text-slate-100'
                        }`}
                      >
                        {todo.text}
                        {todo.dueDate !== null && !todo.done && (
                          <span
                            className={`ml-2 text-sm ${
                              getDueStatus(todo) === 'overdue'
                                ? 'text-red-500 font-medium'
                                : getDueStatus(todo) === 'dueSoon'
                                ? 'text-amber-500 font-medium'
                                : 'text-gray-400 dark:text-slate-500'
                            }`}
                          >
                            📅 {formatDueDate(todo.dueDate, lang)}
                          </span>
                        )}
                      </span>

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
                      <label className="relative flex-shrink-0 cursor-pointer">
                        <input
                          type="date"
                          className="absolute opacity-0 w-0 h-0"
                          onChange={(e) => {
                            const val = e.target.value;
                            setDueDate(todo.id, val ? new Date(val).getTime() + 86399999 : null);
                          }}
                          title={todo.dueDate ? t.clearDueDate : t.setDueDate}
                        />
                        <span
                          className={`text-base transition-colors ${
                            todo.dueDate
                              ? getDueStatus(todo) === 'overdue'
                                ? 'text-red-400 hover:text-red-500'
                                : getDueStatus(todo) === 'dueSoon'
                                ? 'text-amber-400 hover:text-amber-500'
                                : 'text-indigo-400 hover:text-indigo-500'
                              : 'text-gray-300 hover:text-gray-400'
                          }`}
                        >
                          📅
                        </span>
                      </label>
                      <button
                        onClick={() => confirmDelete(todo.id, todo.text)}
                        className="text-gray-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 transition-colors text-sm"
                        title={t.delete}
                      >
                        🗑️
                      </button>
                    </li>
                  ))}
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

            {/* TodoChat Section */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                  <span>💬</span>
                  AI 助手
                </h2>
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                >
                  {showChat ? '收起' : '展开'}
                </button>
              </div>
              {showChat && (
                <TodoChat className="h-96" />
              )}
            </div>
          </div>

          {/* Floating Action Button for Chat */}
          {!showChat && (
            <button
              onClick={() => setShowChat(true)}
              className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-500 dark:bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-all flex items-center justify-center text-2xl z-50"
              title="打开 AI 助手"
            >
              💬
            </button>
          )}
        </div>

        {deleteConfirm && (
          <DeleteConfirmDialog
            todoText={deleteConfirm.text}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteConfirm(null)}
          />
        )}
      </LangContext.Provider>
    </ThemeContext.Provider>
  );
}
