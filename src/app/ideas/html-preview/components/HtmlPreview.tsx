'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

export interface HtmlPreviewHandle {
  writeChunk: (html: string) => void;
}

interface HtmlPreviewProps {
  html: string;
}

const HtmlPreviewComponent = forwardRef<HtmlPreviewHandle, HtmlPreviewProps>(
  ({ html }, ref) => {
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
    const codeRef = useRef<HTMLElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const isStreamingRef = useRef(false);
    const streamDocRef = useRef<string>('');

    // Expose writeChunk via ref so parent can stream HTML in real-time
    useImperativeHandle(ref, () => ({
      writeChunk: (chunk: string) => {
        if (!iframeRef.current?.contentDocument) return;
        const doc = iframeRef.current.contentDocument;
        if (!doc.body) return;

        // First chunk - initialize the document
        if (!isStreamingRef.current) {
          isStreamingRef.current = true;
          streamDocRef.current = chunk;
          iframeRef.current.srcdoc = chunk;
        } else {
          // Subsequent chunks - append to body
          streamDocRef.current = chunk;
          // For streaming, we replace the entire srcdoc since we can't easily append
          // But we store the latest to avoid re-creation
          iframeRef.current.srcdoc = chunk;
        }
      },
    }));

    // When html prop changes (stream complete), update iframe
    useEffect(() => {
      if (html && iframeRef.current) {
        isStreamingRef.current = false;
        iframeRef.current.srcdoc = html;
      }
    }, [html]);

    // Highlight code when switching to code tab
    useEffect(() => {
      if (activeTab === 'code' && codeRef.current) {
        hljs.highlightElement(codeRef.current);
      }
    }, [activeTab, html]);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(html);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };

    return (
      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        {/* Tab Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              👁️ 预览
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'code'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📄 代码
            </button>
          </div>
          <div className="flex items-center gap-2">
            {isStreamingRef.current && (
              <span className="text-xs text-indigo-500 animate-pulse">● 直播生成中</span>
            )}
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
              }`}
            >
              {copied ? '✅ 已复制' : '📋 复制代码'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[500px]">
          {activeTab === 'preview' ? (
            <iframe
              ref={iframeRef}
              srcDoc={html || '<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9fafb;font-family:system-ui;"><p style="color:#9ca3af;">预览区域</p></body></html>'}
              sandbox="allow-scripts allow-modals"
              title="HTML Preview"
              className="w-full h-full border-0"
            />
          ) : (
            <div className="h-full overflow-auto bg-gray-50">
              <pre className="p-4 m-0">
                <code ref={codeRef} className="hljs text-sm">
                  {html || '// 代码将在这里显示'}
                </code>
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }
);

HtmlPreviewComponent.displayName = 'HtmlPreview';

export default HtmlPreviewComponent;
