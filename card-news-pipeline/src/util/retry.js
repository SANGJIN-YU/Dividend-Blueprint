import { logger } from '../logger.js';
import { config } from '../config.js';

/**
 * 외부 API 호출용 재시도 래퍼. 실패 시 최대 config.retry.maxAttempts 만큼 재시도한다 (NFR: 신뢰성).
 */
export async function withRetry(label, fn) {
  const maxAttempts = config.retry.maxAttempts;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts + 1; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warn(`${label} 호출 실패 (시도 ${attempt}/${maxAttempts + 1})`, {
        error: error.message,
        stack: error.stack,
      });
      if (attempt <= maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }
  // cause 로 원본 에러(스택 포함)를 보존해, 재시도 소진 후에도 실제 실패 지점을 추적할 수 있게 한다.
  throw new Error(
    `${label} 호출이 ${maxAttempts + 1}회 시도 후에도 실패했습니다: ${lastError.message}`,
    { cause: lastError }
  );
}
