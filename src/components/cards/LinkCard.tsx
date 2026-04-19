'use client';

import type { LinkSegment } from './ContentParser';

interface LinkCardProps {
  url: string;
  title?: string;
}

function getDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
}

export function LinkCard({ url, title }: LinkCardProps) {
  const domain = getDomain(url);
  const faviconUrl = getFaviconUrl(url);
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="my-2 block rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden 
        hover:border-indigo-300 dark:hover:border-indigo-600 
        hover:shadow-md dark:hover:shadow-slate-900/50
        transition-all duration-200"
    >
      <div className="p-3 flex items-start gap-3">
        {/* Favicon */}
        {faviconUrl && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
            <img
              src={faviconUrl}
              alt=""
              className="w-6 h-6"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
              {title}
            </p>
          )}
          <p className="text-xs text-indigo-500 dark:text-indigo-400 truncate">
            {domain}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">
            {url}
          </p>
        </div>
        
        {/* External link icon */}
        <div className="flex-shrink-0 self-center">
          <svg
            className="w-4 h-4 text-gray-400 dark:text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </div>
      </div>
    </a>
  );
}

export type { LinkSegment };
