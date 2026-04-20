import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { getModel } from '@/lib/aiProvider';

/**
 * HTML Generation API Route - MiniMax SSE Streaming
 *
 * Accepts POST requests with:
 * - description: string - 功能描述（优化后的）
 * - variables: Variable[] - 提取的变量定义（name, type, label, defaultValue）
 * - paramValues: Record<string, string> - 用户当前填入的参数值
 *
 * Returns SSE stream of generated HTML code with {{variable}} placeholders
 * using the exact variable names from the extracted variables list.
 */
export async function POST(req: NextRequest) {
  try {
    try {
      getModel();
    } catch {
      return new Response('MINIMAX_API_KEY is not configured', { status: 500 });
    }

    let body: {
      description?: string;
      variables?: Array<{ name: string; type: string; label: string; defaultValue: string }>;
      paramValues?: Record<string, string>;
    };
    try {
      body = await req.json();
    } catch {
      return new Response('invalid JSON', { status: 400 });
    }

    const { description, variables = [], paramValues = {} } = body;

    if (!description) {
      return new Response('description is required', { status: 400 });
    }

    // Build variable instructions for the AI
    const varInstructions = variables.length > 0
      ? `\n\n必须使用的变量占位符（变量名必须完全匹配）：\n${variables.map(v => `- {{${v.name}}}：${v.label}（默认值：${v.defaultValue || '无'}）`).join('\n')}\n\n重要：生成的HTML中必须使用上述所有变量占位符，不要自行定义其他变量名。`
      : '';

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
6. 只返回HTML代码，不要任何解释、markdown代码块或注释
7. 在HTML中用对应的{{变量名}}占位符替换掉用户描述中的具体数据值`,
      messages: [
        {
          role: 'user',
          content: `生成HTML模板：${description}${varInstructions}`,
        },
      ],
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error('[html-gen route]', error);
    return new Response(String(error), { status: 500 });
  }
}
