import { config } from '../config.js';
import { withRetry } from '../util/retry.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/** Claude Messages API 호출 (FR-04). */
export async function generateText({ system, prompt, maxTokens = 300 }) {
  if (!config.anthropic.apiKey) {
    throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다. .env를 확인하세요.');
  }

  return withRetry('Claude API', async () => {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.anthropic.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: config.anthropic.model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Claude API HTTP 오류: ${response.status} ${errorBody}`);
    }

    const body = await response.json();
    const textBlock = body.content?.find((block) => block.type === 'text');
    if (!textBlock) {
      throw new Error('Claude API 응답에서 텍스트를 찾을 수 없습니다.');
    }
    return textBlock.text.trim();
  });
}
