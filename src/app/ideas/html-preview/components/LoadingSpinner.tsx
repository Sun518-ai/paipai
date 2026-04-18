'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

/**
 * 3-dot pulse loading animation
 */
export default function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  const containerSizes = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="inline-flex items-center gap-3">
      <div className={`flex items-center ${containerSizes[size]}`}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${dotSizes[size]} bg-indigo-500 rounded-full animate-pulse`}
            style={{
              animationDelay: `${i * 150}ms`,
              animationDuration: '600ms',
            }}
          />
        ))}
      </div>
      {text && (
        <span className={`text-gray-500 dark:text-gray-400 ${textSizes[size]}`}>{text}</span>
      )}
    </div>
  );
}
