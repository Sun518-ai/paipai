import { minimax } from 'vercel-minimax-ai-provider';
import { streamText } from 'ai';

// Edge runtime is required for streaming with Vercel AI SDK
export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: minimax('MiniMax-Text-01'),
    system: `你是派派点子站的 AI 助手，帮助用户管理待办事项。

当前功能：
- 添加、修改、删除待办事项
- 设置任务优先级（P0-紧急、P1-高、P2-中、P3-低）
- 置顶重要任务
- 查看和管理待办列表

请用友好、简洁的方式回复。如果用户询问关于待办事项的操作，请根据上下文提供帮助。`,
    messages,
  });

  return result.toUIMessageStreamResponse();
}
