/**
 * 统一 MiniMax AI Provider 封装
 * 
 * 使用方式:
 *   import { getModel } from '@/lib/aiProvider';
 *   const model = getModel();
 */

import { createMinimaxOpenAI } from 'vercel-minimax-ai-provider';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.7';

// Validate API key at module load time (only in server-side code)
if (!MINIMAX_API_KEY) {
  console.error('[aiProvider] MINIMAX_API_KEY is not set. Please configure it in .env.local');
}

/**
 * MiniMax Provider 实例
 */
export const minimaxProvider = createMinimaxOpenAI({
  apiKey: MINIMAX_API_KEY,
  baseURL: process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1',
});

/**
 * 获取当前配置的 MiniMax 模型
 */
export const getModel = () => {
  if (!MINIMAX_API_KEY) {
    throw new Error(
      'MINIMAX_API_KEY is not configured. Please add MINIMAX_API_KEY to your .env.local file.'
    );
  }
  return minimaxProvider(MINIMAX_MODEL);
};

/**
 * 直接导出 provider 和默认 model name
 */
export { MINIMAX_MODEL };
