import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { withRetry } from '../util/retry.js';

/**
 * 종목의 전일 대비 등락률(%)을 조회한다 (FR-01 필터용).
 *
 * provider:
 *  - 'mock'    : data/fixtures/priceChanges.json 사용 (기본값)
 *  - 'generic' : STOCK_API_URL/STOCK_API_KEY 로 지정된 REST 엔드포인트 호출.
 *                실제 시세 제공사의 응답 스펙에 맞춰 mapResponse() 를 조정한다.
 */
export async function fetchPriceChangeRate(stockCode) {
  const provider = config.stock.provider;

  if (provider === 'mock') {
    return loadMockPriceChange(stockCode);
  }

  if (provider === 'generic') {
    return fetchGenericProvider(stockCode);
  }

  throw new Error(`알 수 없는 STOCK_API_PROVIDER: ${provider}`);
}

function loadMockPriceChange(stockCode) {
  const file = path.join(config.dataDir, 'fixtures', 'priceChanges.json');
  const list = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const found = list.find((entry) => entry.stockCode === stockCode);
  return found ? found.changeRate : 0;
}

async function fetchGenericProvider(stockCode) {
  if (!config.stock.apiKey) {
    throw new Error('STOCK_API_KEY가 설정되지 않았습니다. .env를 확인하세요.');
  }
  if (!process.env.STOCK_API_URL) {
    throw new Error('STOCK_API_URL이 설정되지 않았습니다. .env를 확인하세요.');
  }

  return withRetry(`주가 등락률 API(${stockCode})`, async () => {
    const url = new URL(process.env.STOCK_API_URL);
    url.searchParams.set('stock_code', stockCode);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.stock.apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`주가 등락률 API HTTP 오류: ${response.status}`);
    }
    const body = await response.json();
    // NOTE: 실제 시세 제공사 계약 확정 후 이 매핑을 조정하세요.
    return Number(body.change_rate ?? body.changeRate ?? 0);
  });
}
