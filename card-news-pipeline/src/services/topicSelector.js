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

  const withPriceChange = await Promise.all(
    mentioned.map(async (company) => {
      const changeRate = await fetchPriceChangeRate(company.stockCode);
      return { ...company, changeRate };
    })
  );

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
