// Content Parser - Parse AI response text into structured segments

export type SegmentType = 'text' | 'task' | 'summary' | 'link' | 'data';

export interface TextSegment {
  type: 'text';
  content: string;
}

export interface TaskSegment {
  type: 'task';
  tasks: TaskItem[];
}

export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface SummarySegment {
  type: 'summary';
  content: string;
}

export interface LinkSegment {
  type: 'link';
  url: string;
  title: string;
}

export interface DataSegment {
  type: 'data';
  metrics: Record<string, string | number>;
}

export type ContentSegment =
  | TextSegment
  | TaskSegment
  | SummarySegment
  | LinkSegment
  | DataSegment;

// Regex patterns for card detection
const TASK_REGEX = /:::task\n([\s\S]*?)\n:::/g;
const SUMMARY_REGEX = /:::summary\n([\s\S]*?)\n:::/g;
const LINK_REGEX = /:::link\n([^\n]+)\n([^\n]*)\n:::/g;
const DATA_REGEX = /:::data\n([\s\S]*?)\n:::/g;

interface MatchInfo {
  index: number;
  length: number;
  type: SegmentType;
  rawContent: string;
}

function parseTaskContent(content: string): TaskItem[] {
  const tasks: TaskItem[] = [];
  const lines = content.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Match patterns like: - [ ] task, - [x] task, * [ ] task, * [x] task
    const match = line.match(/^[\-\*]\s*\[[\s|x]\]\s*(.+)$/i);
    if (match) {
      tasks.push({
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: match[1].trim(),
        completed: line.includes('[x]') || line.includes('[X]'),
      });
    }
  }
  
  return tasks;
}

function parseLinkContent(content: string): { url: string; title: string } {
  const lines = content.split('\n').filter(line => line.trim());
  return {
    url: lines[0] || '',
    title: lines.slice(1).join(' ').trim(),
  };
}

function parseDataContent(content: string): Record<string, string | number> {
  try {
    // Try JSON format
    const parsed = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch {
    // Try key: value format
    const metrics: Record<string, string | number> = {};
    const lines = content.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        const value = match[2].trim();
        metrics[match[1].trim()] = isNaN(Number(value)) ? value : Number(value);
      }
    }
    
    if (Object.keys(metrics).length > 0) {
      return metrics;
    }
  }
  
  return {};
}

export function parseContent(text: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  
  // Collect all matches with their positions
  const matches: MatchInfo[] = [];
  
  let match;
  
  // Task matches
  TASK_REGEX.lastIndex = 0;
  while ((match = TASK_REGEX.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      type: 'task',
      rawContent: match[1],
    });
  }
  
  // Summary matches
  SUMMARY_REGEX.lastIndex = 0;
  while ((match = SUMMARY_REGEX.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      type: 'summary',
      rawContent: match[1],
    });
  }
  
  // Link matches
  LINK_REGEX.lastIndex = 0;
  while ((match = LINK_REGEX.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      type: 'link',
      rawContent: match[1] + '\n' + (match[2] || ''),
    });
  }
  
  // Data matches
  DATA_REGEX.lastIndex = 0;
  while ((match = DATA_REGEX.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      type: 'data',
      rawContent: match[1],
    });
  }
  
  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);
  
  let lastIndex = 0;
  
  for (const m of matches) {
    // Add text before this match
    if (m.index > lastIndex) {
      const textContent = text.slice(lastIndex, m.index);
      if (textContent.trim()) {
        segments.push({ type: 'text', content: textContent });
      }
    }
    
    // Add card segment based on type
    switch (m.type) {
      case 'task':
        segments.push({
          type: 'task',
          tasks: parseTaskContent(m.rawContent),
        });
        break;
      case 'summary':
        segments.push({
          type: 'summary',
          content: m.rawContent.trim(),
        });
        break;
      case 'link':
        const linkData = parseLinkContent(m.rawContent);
        segments.push({
          type: 'link',
          url: linkData.url,
          title: linkData.title,
        });
        break;
      case 'data':
        segments.push({
          type: 'data',
          metrics: parseDataContent(m.rawContent),
        });
        break;
    }
    
    lastIndex = m.index + m.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText.trim()) {
      segments.push({ type: 'text', content: remainingText });
    }
  }
  
  return segments;
}
