// Todo tools for MiniMax Function Calling
// These tools are passed to MiniMax as function definitions

export const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "create_todo",
      description: "Create a new todo item. Use when user wants to add a task.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Todo title/task description, e.g. '买鸡蛋', '完成项目报告'"
          },
          priority: {
            type: "string",
            enum: ["P0", "P1", "P2", "P3"],
            description: "Priority level. P0=紧急重要, P1=重要, P2=普通, P3=低"
          },
          dueDate: {
            type: "string",
            description: "Due date in YYYY-MM-DD format (optional), e.g. '2026-04-10'"
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Tags for the task, e.g. ['工作', '紧急']"
          }
        },
        required: ["text"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "list_todos",
      description: "List all todo items. Use when user wants to see their tasks.",
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            enum: ["all", "active", "done"],
            description: "Filter by status: all (default), active (undone), done"
          },
          tag: {
            type: "string",
            description: "Filter by tag name (optional), e.g. '工作'"
          },
          priority: {
            type: "string",
            enum: ["P0", "P1", "P2", "P3"],
            description: "Filter by priority (optional)"
          }
        }
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "complete_todo",
      description: "Mark a todo as completed. Use when user says '完成了', 'done', '搞定' etc.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The todo text to mark as done, e.g. '买鸡蛋'. Can be partial match."
          }
        },
        required: ["text"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "delete_todo",
      description: "Delete a todo item permanently.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The todo text to delete. Can be partial match."
          }
        },
        required: ["text"]
      }
    }
  }
];

// Tool implementations (called by the API route)
export type ToolName = 'create_todo' | 'list_todos' | 'complete_todo' | 'delete_todo';
