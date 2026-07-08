import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { withRetry } from '../util/retry.js';

/**
 * 뉴스 언급량 상위 기업 목록을 가져온다 (FR-01).
 *
 * provider:
 *  - 'mock'    : data/fixtures/mentionCompanies.json 사용 (기본값, API 키 불필요)
 *  - 'generic' : NEWS_API_URL/NEWS_API_KEY 로 지정된 REST 엔드포인트 호출.
 *                실제 뉴스 언급량 서비스(예: 빅카인즈)의 응답 스펙에 맞춰
 *                아래 mapResponse() 를 계약 확정 후 수정해서 사용한다.
 *
 * 반환 형식: [{ stockCode, companyName, mentionCount }]
 */
export async function fetchTopMentionedCompanies({ limit = 10 } = {}) {
  const provider = config.news.provider;

  if (provider === 'mock') {
    return loadMockMentions(limit);
  }

  if (provider === 'generic') {
    return fetchGenericProvider(limit);
  }

  throw new Error(`알 수 없는 NEWS_API_PROVIDER: ${provider}`);
}

function loadMockMentions(limit) {
  const file = path.join(config.dataDir, 'fixtures', 'mentionCompanies.json');
  const list = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return list.slice(0, limit);
}

async function fetchGenericProvider(limit) {
  if (!config.news.apiKey) {
    throw new Error('NEWS_API_KEY가 설정되지 않았습니다. .env를 확인하세요.');
  }
  if (!process.env.NEWS_API_URL) {
    throw new Error('NEWS_API_URL이 설정되지 않았습니다. .env를 확인하세요.');
  }

  return withRetry('뉴스 언급량 API', async () => {
    const url = new URL(process.env.NEWS_API_URL);
    url.searchParams.set('limit', String(limit));

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.news.apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`뉴스 언급량 API HTTP 오류: ${response.status}`);
    }
    const body = await response.json();
    return mapResponse(body);
  });
}

function mapResponse(body) {
  // NOTE: 실제 뉴스 API 계약 확정 후 이 매핑을 조정하세요.
  const items = body.companies ?? body.items ?? [];
  return items.map((item) => ({
    stockCode: item.stock_code ?? item.stockCode,
    companyName: item.name ?? item.company_name ?? item.companyName,
    mentionCount: Number(item.mention_count ?? item.mentionCount ?? 0),
  }));
}
