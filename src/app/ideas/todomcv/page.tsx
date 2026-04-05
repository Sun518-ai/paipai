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
  tagIds: string[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
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
    delete: '删除',
    inProgress: '项进行中',
    completed: '项已完成',
    clearDone: '清除已完成',
    toggleLang: 'EN',
    toggleTheme: '深色模式',
    pin: '置顶',
    unpin: '取消置顶',
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
    delete: 'Delete',
    inProgress: ' active',
    completed: ' completed',
    clearDone: 'Clear Completed',
    toggleLang: '中',
    toggleTheme: 'Dark Mode',
    pin: 'Pin',
    unpin: 'Unpin',
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

// ─── TagBadge ───────────────────────────────────────────────────────────────
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
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [showTagPicker, setShowTagPicker] = useState<string | null>(null);
  const [showTagManage, setShowTagManage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];

  const applyTheme = (th: Theme) => {
    document.documentElement.dataset.theme = th;
  };

  useEffect(() => {
    loadHybrid<Lang>('paipai-todomcv-lang', 'zh').then((l) => setLang(l));
    loadHybrid<Todo[]>('paipai-todos', []).then((todos) => {
      setTodos(todos.map((t) => ({ ...t, tagIds: t.tagIds || [] })));
    });
    loadHybrid<Tag[]>('paipai-tags', DEFAULT_TAGS).then((loadedTags) => {
      const merged = [...DEFAULT_TAGS];
      loadedTags.forEach((lt) => {
        if (!merged.find((d) => d.id === lt.id)) merged.push(lt);
      });
      setTags(merged);
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

  useEffect(() => {
    saveHybrid('paipai-tags', tags);
  }, [tags]);

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
      { id: genId(), text, done: false, pinned: false, createdAt: Date.now(), tagIds: [] },
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
      return b.createdAt - a.createdAt;
    });

  const activeCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - activeCount;

  const langValue = { lang, t, toggleLang };
  const themeValue = { theme, toggleTheme };

  const getTagById = (id: string) => tags.find((tag) => tag.id === id);

  const bgStyle = {
    background: `linear-gradient(to bottom right, var(--bg-gradient-start), var(--bg-gradient-mid), var(--bg-gradient-end))`,
  };

  return (
    <ThemeContext.Provider value={themeValue}>
      <LangContext.Provider value={langValue}>
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

            {/* Input */}
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

            {/* Filter tabs */}
            <div className="flex items-center gap-1 mb-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-1">
              {(['all', 'active', 'done'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-indigo-500 dark:bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                  }`}
                >
                  {f === 'all' ? t.filterAll : f === 'active' ? t.filterActive : t.filterDone}
                  {f === 'all' && ` (${todos.length})`}
                  {f === 'active' && ` (${activeCount})`}
                  {f === 'done' && ` (${doneCount})`}
                </button>
              ))}
            </div>

            {/* Todo list */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-2">📝</p>
                  <p className="text-gray-400 dark:text-slate-500">
                    {filter === 'all'
                      ? t.emptyAll
                      : filter === 'active'
                      ? t.emptyActive
                      : t.emptyDone}
                  </p>
                </div>
              ) : (
                <ul>
                  {filtered.map((todo, idx) => {
                    const todoTags = todo.tagIds.map(getTagById).filter(Boolean) as Tag[];
                    return (
                      <li
                        key={todo.id}
                        className={`flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${idx !== filtered.length - 1 ? 'border-b border-gray-50 dark:border-slate-700/50' : ''}`}
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
                        <span
                          className={`flex-1 text-lg transition-all ${todo.done ? 'text-gray-400 dark:text-slate-500 line-through' : 'text-gray-800 dark:text-slate-100'}`}
                        >
                          {todo.text}
                        </span>
                        {todoTags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {todoTags.map((tag) => (
                              <TagBadge key={tag.id} tag={tag} small />
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => setShowTagPicker(todo.id)}
                          className="text-gray-300 dark:text-slate-600 hover:text-indigo-400 dark:hover:text-indigo-400 transition-colors text-sm"
                          title={t.selectTags}
                        >
                          🏷️
                        </button>
                        <button
                          onClick={() => togglePin(todo.id)}
                          className={`text-base transition-colors ${todo.pinned ? 'text-amber-400 hover:text-amber-600' : 'text-gray-300 hover:text-amber-400'}`}
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

            {/* Footer */}
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
