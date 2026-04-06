'use client';

import { useRef, useEffect, useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  pinned: boolean;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  dueDate: number | null;
}

interface ReminderConfig {
  enabled: boolean;
  advanceNotice: '1h' | '1d';
}

const REMINDER_CONFIG_KEY = 'paipai-todo-reminder-config';
const DEFAULT_CONFIG: ReminderConfig = {
  enabled: true,
  advanceNotice: '1h',
};

type DueStatus = 'normal' | 'dueSoon' | 'overdue';

interface TodoChatProps {
  className?: string;
}

function getDueStatus(dueDate: number | null, done: boolean, advanceNotice: '1h' | '1d'): DueStatus {
  if (done || dueDate === null) return 'normal';
  const now = Date.now();
  const diff = dueDate - now;
  if (diff < 0) return 'overdue';
  const threshold = advanceNotice === '1d' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  if (diff <= threshold) return 'dueSoon';
  return 'normal';
}

function formatRemainingTime(dueDate: number): string {
  const diff = dueDate - Date.now();
  if (diff < 0) return '已过期';
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} 天后到期`;
  if (hours > 0) return `${hours} 小时后到期`;
  const minutes = Math.floor(diff / (60 * 1000));
  return `${minutes} 分钟后到期`;
}

async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'default') {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

function sendDueNotification(todo: Todo, remainingTime: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const notification = new Notification('📅 任务即将到期', {
    body: `${todo.text}\n剩余时间: ${remainingTime}`,
    tag: `due-${todo.id}`,
  });
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

export default function TodoChat({ className = '' }: TodoChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [reminderConfig, setReminderConfig] = useState<ReminderConfig>(DEFAULT_CONFIG);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const notifiedTasksRef = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load todos and config from localStorage
  useEffect(() => {
    try {
      const savedTodos = localStorage.getItem('paipai-todos');
      if (savedTodos) {
        setTodos(JSON.parse(savedTodos));
      }
      const savedConfig = localStorage.getItem(REMINDER_CONFIG_KEY);
      if (savedConfig) {
        setReminderConfig(JSON.parse(savedConfig));
      }
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    } catch {}
  }, []);

  // Save todos to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem('paipai-todos', JSON.stringify(todos));
    } catch {}
  }, [todos]);

  // Save config to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(REMINDER_CONFIG_KEY, JSON.stringify(reminderConfig));
    } catch {}
  }, [reminderConfig]);

  // Request notification permission
  useEffect(() => {
    if (reminderConfig.enabled && notificationPermission === 'default') {
      requestNotificationPermission().then(setNotificationPermission);
    }
  }, [reminderConfig.enabled, notificationPermission]);

  // Check for due tasks and send notifications
  useEffect(() => {
    if (!reminderConfig.enabled) return;
    if (notificationPermission !== 'granted') return;

    const checkDueTasks = () => {
      const now = Date.now();
      todos.forEach((todo) => {
        if (todo.done || !todo.dueDate) return;
        const status = getDueStatus(todo.dueDate, todo.done, reminderConfig.advanceNotice);
        const notifyKey = `${todo.id}-${reminderConfig.advanceNotice}`;
        
        if ((status === 'overdue' || status === 'dueSoon') && !notifiedTasksRef.current.has(notifyKey)) {
          sendDueNotification(todo, formatRemainingTime(todo.dueDate));
          notifiedTasksRef.current.add(notifyKey);
        }
      });
    };

    // Check immediately on mount
    checkDueTasks();
    
    // Then check every minute
    const interval = setInterval(checkDueTasks, 60 * 1000);
    return () => clearInterval(interval);
  }, [todos, reminderConfig, notificationPermission]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedContent]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Get overdue and due soon tasks for status display
  const overdueTasks = todos.filter((t) => !t.done && getDueStatus(t.dueDate, t.done, reminderConfig.advanceNotice) === 'overdue');
  const dueSoonTasks = todos.filter((t) => !t.done && getDueStatus(t.dueDate, t.done, reminderConfig.advanceNotice) === 'dueSoon');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamedContent('');

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        setStreamedContent(fullContent);
      }

      // Add the complete assistant message
      const assistantMessage: Message = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        role: 'assistant',
        content: fullContent,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamedContent('');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User cancelled - keep any partial content
        if (streamedContent) {
          const assistantMessage: Message = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            role: 'assistant',
            content: streamedContent + '\n\n[生成已中断]',
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setStreamedContent('');
        }
      } else {
        const errorMessage: Message = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          role: 'assistant',
          content: `⚠️ 发生错误: ${error.message || '未知错误'}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleReminderEnabled = () => {
    setReminderConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const toggleAdvanceNotice = () => {
    setReminderConfig((prev) => ({
      ...prev,
      advanceNotice: prev.advanceNotice === '1h' ? '1d' : '1h',
    }));
  };

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-gradient-to-r from-indigo-500 to-purple-500">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <span className="text-lg">🤖</span>
          AI 助手
        </h3>
      </div>

      {/* Due Status Banner */}
      {(overdueTasks.length > 0 || dueSoonTasks.length > 0) && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/30">
          <div className="flex items-center gap-2 text-sm">
            {overdueTasks.length > 0 && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <span className="font-medium">🔴 {overdueTasks.length} 项已过期</span>
              </span>
            )}
            {dueSoonTasks.length > 0 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <span className="font-medium">🟠 {dueSoonTasks.length} 项即将到期</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-h-80 min-h-48 p-4 space-y-4">
        {messages.length === 0 && !streamedContent ? (
          <div className="text-center text-gray-400 dark:text-slate-500 py-8">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm">发送消息开始对话</p>
            {(overdueTasks.length > 0 || dueSoonTasks.length > 0) && (
              <div className="mt-4 text-left">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">📋 任务概览：</p>
                {overdueTasks.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-1">
                    🔴 {t.text.length > 20 ? t.text.slice(0, 20) + '...' : t.text}
                  </div>
                ))}
                {dueSoonTasks.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 mb-1">
                    🟠 {t.text.length > 20 ? t.text.slice(0, 20) + '...' : t.text}
                  </div>
                ))}
                {reminderConfig.enabled && notificationPermission !== 'granted' && (
                  <button
                    onClick={() => requestNotificationPermission().then(setNotificationPermission)}
                    className="mt-2 text-xs text-indigo-500 hover:text-indigo-600 underline"
                  >
                    点击开启通知提醒
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    message.role === 'user'
                      ? 'bg-indigo-500 text-white rounded-br-md'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-bl-md'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium mb-1 block">
                      AI 助手
                    </span>
                  )}
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
            {/* Streaming content */}
            {streamedContent && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-2 text-sm bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-bl-md">
                  <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium mb-1 block">
                    AI 助手
                  </span>
                  <div className="whitespace-pre-wrap break-words">
                    {streamedContent}
                    <span className="inline-block ml-1 animate-pulse">▌</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Settings Footer */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleReminderEnabled}
            className={`px-2 py-1 rounded ${
              reminderConfig.enabled
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
            }`}
          >
            🔔 {reminderConfig.enabled ? '提醒开' : '提醒关'}
          </button>
          {reminderConfig.enabled && (
            <button
              onClick={toggleAdvanceNotice}
              className="px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300"
            >
              ⏰ {reminderConfig.advanceNotice === '1h' ? '1小时' : '1天'}
            </button>
          )}
        </div>
        {notificationPermission === 'denied' && reminderConfig.enabled && (
          <span className="text-red-500">通知已被禁用</span>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 dark:border-slate-700">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
              className="w-full px-4 py-2 pr-12 text-sm border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 resize-none"
              rows={1}
              disabled={isLoading}
            />
            {isLoading && (
              <button
                type="button"
                onClick={handleStop}
                className="absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                title="停止生成"
              >
                ⏹
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-indigo-500 dark:bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isLoading ? (
              <span className="flex items-center gap-1">
                <span className="animate-spin">◌</span>
              </span>
            ) : (
              '发送'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// Local storage utilities for apps not using Feishu Bitable

export async function loadHybrid<T>(localKey: string, defaultValue: T): Promise<T> {
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultValue;
}

export function saveHybrid(localKey: string, data: unknown): void {
  try { localStorage.setItem(localKey, JSON.stringify(data)); } catch {}
}
