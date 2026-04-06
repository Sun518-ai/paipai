'use client';

import { useRef, useEffect, useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface TodoChatProps {
  className?: string;
}

export default function TodoChat({ className = '' }: TodoChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-gradient-to-r from-indigo-500 to-purple-500">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <span className="text-lg">🤖</span>
          AI 助手
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-h-80 min-h-48 p-4 space-y-4">
        {messages.length === 0 && !streamedContent ? (
          <div className="text-center text-gray-400 dark:text-slate-500 py-8">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm">发送消息开始对话</p>
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
