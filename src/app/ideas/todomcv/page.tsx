'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function TodoMCVPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('paipai-todos');
      if (saved) setTodos(JSON.parse(saved));
    } catch {}
    inputRef.current?.focus();
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('paipai-todos', JSON.stringify(todos));
    } catch {}
  }, [todos]);

  const addTodo = () => {
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [
      { id: genId(), text, done: false, createdAt: Date.now() },
      ...prev,
    ]);
    setInput('');
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const clearDone = () => {
    setTodos((prev) => prev.filter((t) => !t.done));
  };

  const filtered = todos.filter((t) => {
    if (filter === 'active') return !t.done;
    if (filter === 'done') return t.done;
    return true;
  });

  const activeCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - activeCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Back link */}
      <div className="max-w-2xl mx-auto px-6 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-indigo-500 hover:text-indigo-700 text-sm font-medium transition-colors"
        >
          ← 返回点子站
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="text-center mb-8">
          <span className="text-5xl mb-3 block">✅</span>
          <h1 className="text-3xl font-bold text-gray-900">TodoMVC</h1>
          <p className="text-gray-500 mt-1">派派的待办事项管理</p>
        </div>

        {/* Input */}
        <div className="flex gap-2 mb-6">
          <input
            ref={inputRef}
            type="text"
            placeholder="添加新任务... 按回车确认"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            className="flex-1 px-4 py-3 text-lg border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />
          <button
            onClick={addTodo}
            className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors shadow-sm"
          >
            添加
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4 bg-white rounded-xl border border-gray-100 p-1">
          {(['all', 'active', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? '全部' : f === 'active' ? '进行中' : '已完成'}
              {f === 'all' && ` (${todos.length})`}
              {f === 'active' && ` (${activeCount})`}
              {f === 'done' && ` (${doneCount})`}
            </button>
          ))}
        </div>

        {/* Todo list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-300">
              <p className="text-4xl mb-2">📝</p>
              <p className="text-gray-400">
                {filter === 'all'
                  ? '还没有任务，添加一个吧！'
                  : filter === 'active'
                  ? '太棒了，所有任务都完成了！🎉'
                  : '还没有已完成的任务'}
              </p>
            </div>
          ) : (
            <ul>
              {filtered.map((todo, idx) => (
                <li
                  key={todo.id}
                  className={`flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors ${
                    idx !== filtered.length - 1
                      ? 'border-b border-gray-50'
                      : ''
                  }`}
                >
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      todo.done
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {todo.done && '✓'}
                  </button>
                  <span
                    className={`flex-1 text-lg transition-all ${
                      todo.done
                        ? 'text-gray-400 line-through'
                        : 'text-gray-800'
                    }`}
                  >
                    {todo.text}
                  </span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-sm"
                    title="删除"
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {todos.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-400 px-1">
            <span>
              {activeCount} 项进行中 · {doneCount} 项已完成
            </span>
            {doneCount > 0 && (
              <button
                onClick={clearDone}
                className="hover:text-red-500 transition-colors"
              >
                清除已完成
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
