'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface AutoHeightIframeProps {
  html: string;
  /** Called when the iframe content is ready */
  onReady?: () => void;
  /** Show loading spinner while content is initializing */
  showLoader?: boolean;
}

const TAILWIND_CDN = 'https://cdn.tailwindcss.com';

/**
 * Wraps HTML with tailwind CDN script injected,
 * plus a __content div for ResizeObserver targeting.
 */
function wrapHtmlForPreview(html: string): string {
  // Inject tailwind CDN if not already present
  const hasTailwind = html.includes('tailwindcss.com') || html.includes('tailwind.css');
  const tailwindScript = hasTailwind
    ? ''
    : `<script src="${TAILWIND_CDN}"></script>`;

  // Wrap content in a known div so ResizeObserver can find it
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    const bodyContent = bodyMatch[1];
    const bodyOpen = html.slice(0, html.indexOf(bodyMatch[0]));
    const wrapped = bodyContent.includes('id="__content"')
      ? bodyContent
      : `<div id="__content">${bodyContent}</div>`;
    return `${bodyOpen}${wrapped}</body></html>`;
  }

  // Fallback: just wrap everything in __content if no body found
  if (!html.includes('id="__content"')) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${tailwindScript}
</head>
<body>
  <div id="__content">${html}</div>
</body>
</html>`;
  }
  return html;
}

export default function AutoHeightIframe({ html, onReady, showLoader = true }: AutoHeightIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const rafRef = useRef<number | null>(null);
  const prevHtmlRef = useRef<string>('');
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [ready, setReady] = useState(false);
  const [srcdoc, setSrcdoc] = useState('');
  const [loading, setLoading] = useState(true);

  // Compute wrapped HTML
  const wrappedHtml = html ? wrapHtmlForPreview(html) : '';

  // Adjust iframe height to match content
  const adjustHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const contentDiv = iframe.contentDocument?.getElementById('__content');
    if (!contentDiv) return;
    const height = contentDiv.offsetHeight;
    if (height > 0) {
      iframe.style.height = `${height}px`;
    }
  }, []);

  const scheduleAdjust = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(adjustHeight);
  }, [adjustHeight]);

  // Sync wrapped HTML into iframe srcdoc — only when content actually changes
  useEffect(() => {
    if (!wrappedHtml || wrappedHtml === prevHtmlRef.current) return;
    prevHtmlRef.current = wrappedHtml;
    setReady(false);
    setLoading(true);
    setSrcdoc(wrappedHtml);
  }, [wrappedHtml]);

  // Once iframe loads, set up ResizeObserver and initial height
  const handleLoad = useCallback(() => {
    setReady(true);
    setLoading(false);
    onReady?.();

    const iframe = iframeRef.current;
    if (!iframe) return;

    // Disconnect previous observer if any
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    const contentDiv = iframe.contentDocument?.getElementById('__content');
    if (!contentDiv) return;

    // Initial height measurement
    scheduleAdjust();

    // Watch for content size changes
    const ro = new ResizeObserver(() => {
      scheduleAdjust();
    });
    ro.observe(contentDiv);
    resizeObserverRef.current = ro;
  }, [onReady, scheduleAdjust]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full">
      {/* Loading overlay */}
      {loading && showLoader && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-slate-800 z-10 rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="h-8 w-8 rounded-full border-4 border-indigo-200 dark:border-indigo-800"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
            </div>
            <span className="text-xs text-gray-400">加载中...</span>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        srcDoc={srcdoc}
        onLoad={handleLoad}
        className="block w-full border-0 rounded-lg transition-all"
        style={{ minHeight: '1em' }}
        sandbox="allow-same-origin allow-scripts allow-modals"
        title="HTML Preview"
      />
    </div>
  );
}
