import { NextRequest, NextResponse } from 'next/server';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!MINIMAX_API_KEY) {
      return NextResponse.json({ error: 'MINIMAX_API_KEY not configured' }, { status: 500 });
    }

    const response = await fetch(`${MINIMAX_BASE_URL}/v1/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `MiniMax API error: ${response.status} - ${text}` }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '我没有理解，请再说一次';

    return NextResponse.json({ content });
  } catch (error) {
    console.error('[chat route]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
