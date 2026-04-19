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
 * Returns SSE stream of generated HTML code
 */
export async function POST(req: NextRequest) {
  try {
    // Validate API key is configured
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

    // Build prompt with description and parameters
    const prompt = `根据以下功能描述和参数生成HTML代码。
功能描述: ${description}
参数: ${JSON.stringify(params, null, 2)}
仅返回HTML代码不要其他内容。生成的HTML应该包含内联CSS样式，使其视觉效果美观。`;

    const result = await streamText({
      model: getModel(),
      system: '你是一个专业的HTML代码生成助手。根据用户提供的功能描述和参数，生成高质量的HTML代码。确保代码完整、可运行，包含内联CSS样式。永远只返回HTML代码，不要返回任何解释或markdown代码块标记。',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Return text stream response

  } catch (error) {
    console.error('[html-gen route]', error);
    return new Response(String(error), { status: 500 });
  }
}
