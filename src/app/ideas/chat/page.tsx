'use client';

import { useChat, Chat } from '@ai-sdk/react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { DefaultChatTransport } from 'ai';
import {
  parseContent,
  type ContentSegment,
  TaskCard,
  SummaryCard,
  LinkCard,
  DataCard,
} from '@/components/cards';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMessageText(message: { parts: Array<{ type: string; text?: string }> }): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text' && !!part.text)
    .map(part => part.text)
    .join('');
}

// ─── i18n ───────────────────────────────────────────────────────────────────

type Locale = 'zh' | 'en';

function detectLocale(): Locale {
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith('zh')) return 'zh';
  }
  return 'en';
}

const i18n = {
  zh: {
    title: '💬 TodoChat',
    placeholder: '输入消息，按 Enter 发送...',
    send: '发送',
    thinking: '🤖 AI 正在思考...',
    emptyHint: '👇 发送消息，开始和 AI 聊聊你的待办事项吧 ✨',
    back: '← 返回点子站',
  },
  en: {
    title: '💬 TodoChat',
    placeholder: 'Type a message, press Enter to send...',
    send: 'Send',
    thinking: '🤖 AI is thinking...',
    emptyHint: '👇 Send a message to start chatting about your todos ✨',
    back: '← Back to Ideas',
  },
};

// ─── Components ───────────────────────────────────────────────────────────────

function TypingIndicator({ locale }: { locale: Locale }) {
  const t = i18n[locale];
  return (
    <div className="flex items-start gap-2.5 animate-fadeIn">
      {/* AI Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-sm">
        🤖
      </div>
      {/* Bubble */}
      <div className="bg-gray-100 dark:bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-slate-400">{t.thinking}</span>
        <span className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
}

function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  const segments = parseContent(content);
  
  // For user messages, just render as plain text
  if (isUser) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }
  
  // For AI messages, render with cards
  return (
    <div className="space-y-1">
      {segments.map((segment, index) => {
        switch (segment.type) {
          case 'task':
            return <TaskCard key={index} tasks={segment.tasks} />;
          case 'summary':
            return <SummaryCard key={index} content={segment.content} />;
          case 'link':
            return <LinkCard key={index} url={segment.url} title={segment.title} />;
          case 'data':
            return <DataCard key={index} metrics={segment.metrics} />;
          case 'text':
          default:
            return segment.content.trim() ? (
              <p key={index} className="whitespace-pre-wrap">{segment.content}</p>
            ) : null;
        }
      })}
    </div>
  );
}

function MessageBubble({
  message,
}: {
  message: { id: string; role: string; parts: Array<{ type: string; text?: string }> };
}) {
  const isUser = message.role === 'user';
  const text = getMessageText(message);

  return (
    <div className={`flex items-start gap-2.5 animate-fadeIn ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
          isUser
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
            : 'bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700'
        }`}
      >
        {isUser ? '👤' : '🤖'}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-indigo-500 text-white rounded-tr-sm'
            : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-100 rounded-tl-sm'
        }`}
      >
        {isUser && <p className="whitespace-pre-wrap">{text}</p>}
        {!isUser && <MessageContent content={text} isUser={isUser} />}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ChatPage() {
  const locale = detectLocale();
  const t = i18n[locale];
  const bgStyle = {
    background: `linear-gradient(to bottom right, var(--bg-gradient-start), var(--bg-gradient-mid), var(--bg-gradient-end))`,
  };

  const [input, setInput] = useState('');

  const chat = new Chat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const {
    messages,
    status,
    sendMessage,
    stop,
  } = useChat({ chat });

  const bottomRef = useRef<HTMLDivElement>(null);

  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll to bottom when messages or loading changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  }

  return (
    <div className="flex flex-col h-screen" style={bgStyle}>
      {/* Header */}
      <div className="max-w-2xl mx-auto w-full px-6 pt-6 flex items-center">
        <Link
          href="/"
          className="mr-auto inline-flex items-center gap-1.5 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium transition-colors"
        >
          {t.back}
        </Link>
        <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
        <div className="w-20" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full px-6 py-6 flex flex-col gap-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-4xl mb-3">💡</p>
            <p className="text-gray-400 dark:text-slate-500 text-sm">{t.emptyHint}</p>
          </div>
        )}

        {messages.map(m => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {isLoading && <TypingIndicator locale={locale} />}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto w-full px-6 py-4">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t.placeholder}
              disabled={isLoading}
              className="flex-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-full
                px-4 py-2.5 text-sm text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500 hover:bg-indigo-600
                disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed
                flex items-center justify-center text-white transition-colors shadow-sm"
              aria-label={t.send}
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>

            {isLoading && (
              <button
                type="button"
                onClick={stop}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500 hover:bg-red-600
                  flex items-center justify-center text-white transition-colors shadow-sm"
                aria-label="Stop"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
