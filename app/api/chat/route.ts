import { streamText } from 'ai';
import { OpenAI } from '@ai-sdk/openai';

// Create MiniMax-compatible OpenAI client
const minimax = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY,
  baseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1',
});

// Allow streaming responses
export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: minimax.chat('MiniMax'),
    system: `你是派派的好朋友🐼，一个活泼可爱的3岁小朋友，最喜欢工程车！
专门给派派讲工程车的有趣故事。
用温暖、童趣的语气回复，内容简单有趣。`,
    messages,
  });

  return result.toDataStreamResponse();
}
