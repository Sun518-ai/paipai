"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";

interface HtmlGeneratorProps {
  description: string;
  params: Record<string, unknown>;
  onHtmlChange?: (html: string) => void;
  /** Called after each chunk with accumulated cleaned HTML for real-time preview */
  onChunk?: (html: string) => void;
}

export default function HtmlGenerator({
  description,
  params,
  onHtmlChange,
  onChunk,
}: HtmlGeneratorProps) {
  const [htmlCode, setHtmlCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const codeContainerRef = useRef<HTMLPreElement>(null);

  // Auto-scroll to bottom when new code is streamed in
  useEffect(() => {
    if (codeContainerRef.current && isLoading) {
      codeContainerRef.current.scrollTop = codeContainerRef.current.scrollHeight;
    }
  }, [htmlCode, isLoading]);

  const generateHtml = useCallback(async () => {
    if (!description.trim()) {
      setError("请输入功能描述");
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    // 60 second timeout
    const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), 60_000);
    setIsLoading(true);
    setError(null);
    setHtmlCode("");
    setProgress("正在连接...");
    onHtmlChange?.("");

    try {
      const response = await fetch("/ideas/html-preview/api/html-gen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description, params }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("响应体为空");
      }

      setProgress("正在生成...");
      let fullHtml = "";

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Parse SSE data - handle both SSE and raw text formats
        const lines = chunk.split("\n");
        for (const line of lines) {
          // Skip empty lines and event markers
          if (!line.trim() || line.startsWith(":")) continue;

          // Parse SSE data line
          const dataMatch = line.match(/^data:\s*(.*)$/);
          if (dataMatch) {
            const data = dataMatch[1];

            // Handle [DONE] signal
            if (data === "[DONE]") {
              continue;
            }

            try {
              // Parse JSON data from AI SDK data stream format
              const jsonData = JSON.parse(data);

              // Extract text content from various possible formats
              let textContent = "";
              if (typeof jsonData === "string") {
                textContent = jsonData;
              } else if (jsonData.text) {
                textContent = jsonData.text;
              } else if (jsonData.content) {
                textContent = jsonData.content;
              } else if (jsonData.delta) {
                textContent = jsonData.delta;
              } else if (jsonData.choices?.[0]?.delta?.content) {
                textContent = jsonData.choices[0].delta.content;
              }

              if (textContent) {
                fullHtml += textContent;
              } else {
                // Not JSON - treat raw data as text content
                const raw = data.trim();
                if (raw) fullHtml += raw;
              }
            } catch {
              // If JSON parse fails, treat raw line as text
              const raw = data.trim();
              if (raw) fullHtml += raw;
            }
          } else {
            // Non-SSE line - treat as raw text
            const raw = line.trim();
            if (raw) fullHtml += raw;
          }

          // Strip markdown markers and update state for every chunk
          const cleaned = fullHtml
            .replace(/^```html\s*/im, '')
            .replace(/^```\s*/im, '')
            .replace(/\s*```\s*$/im, '')
            .trim();

          setHtmlCode(fullHtml);
          if (cleaned) onChunk?.(cleaned);
        }
      }

      // Strip markdown code block markers before passing to preview
      const cleanedHtml = fullHtml
        .replace(/^```html\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      if (cleanedHtml) {
        onHtmlChange?.(cleanedHtml);
      }

      clearTimeout(timeoutId);
      setProgress("");
    } catch (err) {
      clearTimeout(timeoutId);
      const error = err as Error;
      if (error.name === "AbortError" || error.name === "DOMException") {
        setProgress("请求超时，请重试");
      } else {
        setError(error.message || "生成失败");
      }
    } finally {
      setIsLoading(false);
    }
  }, [description, params, onHtmlChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={generateHtml}
            disabled={isLoading || !description.trim()}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-500 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                生成中...
              </span>
            ) : (
              "🎨 生成 HTML"
            )}
          </button>
          
          {isLoading && (
            <button
              onClick={() => abortControllerRef.current?.abort()}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              取消
            </button>
          )}
        </div>
        
        {progress && (
          <span className="text-sm text-indigo-500 animate-pulse">{progress}</span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">❌ {error}</p>
        </div>
      )}

      {/* Code Display Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300">
            📄 生成的代码
          </h3>
          {htmlCode && !isLoading && (
            <button
              onClick={() => navigator.clipboard.writeText(htmlCode)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              📋 复制代码
            </button>
          )}
        </div>
        
        <div className="flex-1 min-h-0 relative">
          {/* Loading Animation */}
          {isLoading && !htmlCode && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-4 border-indigo-200 dark:border-indigo-800"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">AI 正在生成代码...</p>
              </div>
            </div>
          )}

          {/* Code Preview */}
          <pre
            ref={codeContainerRef}
            className="h-full overflow-auto p-4 bg-gray-900 dark:bg-slate-900 rounded-lg text-sm font-mono text-gray-100 border border-gray-200 dark:border-slate-700"
          >
            {htmlCode ? (
              <code>{htmlCode}</code>
            ) : (
              <span className="text-gray-500 dark:text-slate-500">
                点击「生成 HTML」按钮开始生成...
              </span>
            )}
          </pre>

          {/* Streaming indicator */}
          {isLoading && htmlCode && (
            <div className="absolute bottom-2 right-2 flex items-center gap-2 px-2 py-1 bg-indigo-500/90 rounded text-xs text-white">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              实时生成中...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
