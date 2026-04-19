import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { getModel } from '@/lib/aiProvider';

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();

    if (!description?.trim()) {
      return new Response('description is required', { status: 400 });
    }

    const result = await streamText({
      model: getModel(),
      system: `You are an expert HTML generation assistant. Your task is to:
1. Analyze the user's natural language description
2. Enhance it into a detailed HTML generation prompt - focus on structure and content, NOT inline styles
3. Extract ONLY content/data variables that a user would want to customize (text labels, titles, images, numbers for content like prices/ages, URLs)
4. DO NOT extract style variables (colors, sizes, fonts, spacing, border-radius, shadows, etc.) - those are handled automatically by the AI
5. Return ONLY a valid JSON object with fields: optimizedDescription (string) and variables (array of {name, type, label, defaultValue})
6. Do NOT include any markdown code blocks, explanations, or any text outside the JSON`,
      messages: [
        {
          role: 'user',
          content: `优化以下描述并提取变量：

描述：${description}

要求：
- 将描述增强为更详细的HTML生成提示词，聚焦内容结构和数据
- 仅提取内容/数据相关变量（如：标题文字、价格数字、描述内容、图片URL、数量等）
- 不要提取样式变量（颜色、字体大小、间距、圆角、阴影等）- 这些由AI自动处理
- 变量名使用英文驼峰命名
- 类型：text(短文本)、textarea(长文本)、number(数字)
- 为每个变量提供合理的中文标签和默认值
- 仅返回JSON格式，不要任何markdown代码块标记`,
        },
      ],
    });

    // Collect the full text response using text stream
    let fullText = '';
    for await (const textPart of result.textStream) {
      fullText += textPart;
    }

    // If no content, return original description
    if (!fullText.trim()) {
      return Response.json({
        optimizedDescription: description,
        variables: [],
      });
    }

    // Strip markdown code blocks if present
    let cleaned = fullText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    // Try to find JSON object in the text
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    try {
      const parsed = JSON.parse(cleaned);
      return Response.json(parsed);
    } catch {
      // If JSON parsing fails, return the raw text as optimized description
      return Response.json({
        optimizedDescription: cleaned || description,
        variables: [],
      });
    }
  } catch (error) {
    console.error('[describe route]', error);
    return new Response(String(error), { status: 500 });
  }
}
