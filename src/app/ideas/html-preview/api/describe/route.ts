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
2. Enhance it into a detailed, specific HTML generation prompt with exact styling details (colors, spacing, fonts, visual effects)
3. Extract all configurable parameters (text content, colors, numbers, etc.) as typed variables
4. Return ONLY a valid JSON object with fields: optimizedDescription (string) and variables (array of {name, type, label, defaultValue})
5. Do NOT include any markdown code blocks, explanations, or any text outside the JSON`,
      messages: [
        {
          role: 'user',
          content: `优化以下描述并提取变量：

描述：${description}

要求：
- 将描述增强为更详细的HTML生成提示词，包含具体的样式规格
- 提取所有可配置的参数（如文字内容、颜色、尺寸等）
- 变量名使用英文驼峰命名
- 类型：text(文本输入)、color(颜色选择)、number(数字输入)、textarea(多行文本)
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
