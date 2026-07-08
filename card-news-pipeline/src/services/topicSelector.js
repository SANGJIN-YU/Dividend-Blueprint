import { fetchTopMentionedCompanies } from '../clients/newsMentionClient.js';
import { fetchPriceChangeRate } from '../clients/stockPriceClient.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

/**
 * 오늘의 화제 기업을 선정한다 (FR-01):
 * 뉴스 언급량 상위 기업 중, 주가 등락률의 절댓값이 임계치 이상인 기업만 남기고
 * 언급량 순으로 정렬해 상위 N개를 반환한다.
 */
export async function selectTopicCompanies({
  count = config.topicCompanyCount,
  minAbsChangeRate = config.minAbsPriceChangeRate,
  candidatePoolSize = Math.max(count * 3, 10),
} = {}) {
  const mentioned = await fetchTopMentionedCompanies({ limit: candidatePoolSize });

  // 개별 기업의 주가 조회 실패가 전체 선정 과정을 중단시키지 않도록, 실패한 기업은
  // 후보에서만 제외하고 나머지 기업으로 계속 진행한다 (리스크 대응: 결측/오류 시 자동 스킵).
  const withPriceChangeResults = await Promise.all(
    mentioned.map(async (company) => {
      try {
        const changeRate = await fetchPriceChangeRate(company.stockCode);
        return { ...company, changeRate };
      } catch (error) {
        logger.warn(`주가 등락률 조회 실패, 후보에서 제외합니다: ${company.companyName}`, {
          error: error.message,
        });
        return null;
      }
    })
  );
  const withPriceChange = withPriceChangeResults.filter((company) => company !== null);

  const filtered = withPriceChange.filter(
    (company) => Math.abs(company.changeRate) >= minAbsChangeRate
  );

  const selected = filtered
    .sort((a, b) => b.mentionCount - a.mentionCount)
    .slice(0, count);

  logger.info('화제 기업 선정 완료', {
    candidateCount: mentioned.length,
    filteredCount: filtered.length,
    selected: selected.map((c) => c.companyName),
  });

  return selected;
}
