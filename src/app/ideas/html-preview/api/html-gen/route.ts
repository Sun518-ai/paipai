import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { getModel } from '@/lib/aiProvider';

/**
 * HTML Generation API Route - MiniMax SSE Streaming
 *
 * Accepts POST requests with:
 * - description: string - 功能描述
 * - params: Record<string, unknown> - 用户填入的参数值
 *
 * Returns SSE stream of generated HTML code with {{variable}} placeholders
 */
export async function POST(req: NextRequest) {
  try {
    try {
      getModel();
    } catch {
      return new Response('MINIMAX_API_KEY is not configured', { status: 500 });
    }

    let body: { description?: string; params?: Record<string, unknown> };
    try {
      body = await req.json();
    } catch {
      return new Response('invalid JSON', { status: 400 });
    }

    const { description, params = {} } = body;

    if (!description) {
      return new Response('description is required', { status: 400 });
    }

    const result = await streamText({
      model: getModel(),
      system: `你是一个专业的HTML模板生成助手。
根据用户描述生成HTML模板代码。
规则：
1. 使用 Tailwind CSS（通过CDN引入：https://cdn.tailwindcss.com）
2. 所有变量用 {{变量名}} 占位符，如 {{title}}、{{content}}、{{count}}
3. 变量名使用英文驼峰命名
4. 深色渐变背景 + 玻璃拟态（glass morphism）风格
5. 视觉效果现代、美观、专业
6. 只返回HTML代码，不要任何解释、markdown代码块或注释`,
      messages: [
        {
          role: 'user',
          content: `生成HTML模板：${description}`,
        },
      ],
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error('[html-gen route]', error);
    return new Response(String(error), { status: 500 });
  }
}
