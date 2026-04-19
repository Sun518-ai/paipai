// Shared Todo types

export type RecurringType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface RecurringRule {
  type: RecurringType;
  dayOfWeek?: number;
  dayOfMonth?: number;
  lastGeneratedAt: number;
  seriesCreatedAt: number;
}

export interface Todo {
  id: string;
  localId: string;
  recordId?: string;
  text: string;
  done: boolean;
  pinned: boolean;
  priority: string;
  tagIds: string[];
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
  recurring?: RecurringRule;
}
