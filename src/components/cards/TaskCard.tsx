'use client';

import { useState } from 'react';
import type { TaskItem, TaskSegment } from './ContentParser';

interface TaskCardProps {
  tasks: TaskItem[];
}

export function TaskCard({ tasks: initialTasks }: TaskCardProps) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const completedCount = tasks.filter(t => t.completed).length;
  
  const handleToggle = (id: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };
  
  if (tasks.length === 0) return null;
  
  return (
    <div className="my-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📝</span>
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
            任务
          </span>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            ({completedCount}/{tasks.length})
          </span>
        </div>
        <span className="text-gray-400 dark:text-slate-500 text-sm">
          {isExpanded ? '−' : '+'}
        </span>
      </button>
      
      {/* Content */}
      {isExpanded && (
        <div className="p-3 space-y-2">
          {tasks.map(task => (
            <label
              key={task.id}
              className="flex items-start gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggle(task.id)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-slate-500 
                  text-indigo-500 dark:text-indigo-400 
                  focus:ring-indigo-400 dark:focus:ring-indigo-500 
                  bg-white dark:bg-slate-700 
                  cursor-pointer"
              />
              <span
                className={`text-sm leading-relaxed ${
                  task.completed
                    ? 'text-gray-400 dark:text-slate-500 line-through'
                    : 'text-gray-700 dark:text-slate-200'
                }`}
              >
                {task.text}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Export TaskSegment type for use in other components
export type { TaskSegment };
