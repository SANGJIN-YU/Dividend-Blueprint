import { generateText } from '../clients/claudeClient.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { formatToEokwon, formatChangeRate } from '../util/format.js';

/**
 * 서사 문장 생성용 가드레일 시스템 프롬프트 (NFR: 투자 권유/전망 단정 표현 금지, FR-04).
 */
const SYSTEM_PROMPT = `당신은 상장기업의 공시 재무 데이터를 일반 독자에게 쉽게 설명하는 금융 에디터입니다.
다음 규칙을 반드시 지키세요:
1. 오직 제공된 수치만 근거로 서술하고, 제공되지 않은 사실을 추측하거나 지어내지 마세요.
2. "매수/매도/투자하세요" 등 투자 권유 표현을 절대 사용하지 마세요.
3. "오를 것이다/떨어질 것이다" 등 미래를 단정하는 전망성 표현을 사용하지 마세요.
4. 과장된 수식어(대박, 폭등, 폭락 등 선정적 표현) 없이 담백한 사실 위주 문장으로 작성하세요.
5. 결과는 반드시 "최근 공시 기준" 임을 알 수 있는 1~2문장의 한국어 서사문으로만 출력하세요. 그 외 설명은 출력하지 마세요.`;

function buildUserPrompt({ companyName, metrics }) {
  const latest = metrics.quarters[metrics.quarters.length - 1];
  return `기업명: ${companyName}
최근 분기: ${latest.label}
최근 분기 매출액: ${formatToEokwon(latest.revenue)}
최근 분기 영업이익: ${formatToEokwon(latest.operatingProfit)}
누적 기준 전년동기대비 매출 증감률: ${formatChangeRate(metrics.yoy.revenueChangeRate)}
누적 기준 전년동기대비 영업이익 증감률: ${formatChangeRate(metrics.yoy.operatingProfitChangeRate)}
전분기 대비 매출 증감률: ${formatChangeRate(metrics.qoq.revenueChangeRate)}
전분기 대비 영업이익 증감률: ${formatChangeRate(metrics.qoq.operatingProfitChangeRate)}
부채비율: ${metrics.debtRatio !== null ? `${metrics.debtRatio.toFixed(1)}%` : '데이터 없음'}

위 수치를 바탕으로 1~2문장의 서사 문장을 작성하세요.`;
}

/** 가공된 지표를 바탕으로 Claude API 로 서사 문장을 생성한다 (FR-04). */
export async function generateNarrative({ companyName, metrics }) {
  if (config.mockMode || !config.anthropic.apiKey) {
    logger.warn('Claude API 미사용: 규칙 기반 폴백 서사문을 생성합니다 (mock/데모 전용)', {
      companyName,
    });
    return buildFallbackNarrative({ companyName, metrics });
  }

  const prompt = buildUserPrompt({ companyName, metrics });
  return generateText({ system: SYSTEM_PROMPT, prompt });
}

/** API 키가 없는 mock/데모 실행을 위한 규칙 기반 대체 서사문 (LLM 미사용). */
function buildFallbackNarrative({ companyName, metrics }) {
  const latest = metrics.quarters[metrics.quarters.length - 1];
  const revenueTrend = metrics.yoy.revenueChangeRate >= 0 ? '증가' : '감소';
  const profitTrend = metrics.yoy.operatingProfitChangeRate >= 0 ? '증가' : '감소';
  return (
    `최근 공시 기준 ${companyName}의 ${latest.label} 매출액은 ${formatToEokwon(latest.revenue)}로 ` +
    `누적 기준 전년동기 대비 ${formatChangeRate(metrics.yoy.revenueChangeRate)} ${revenueTrend}했습니다. ` +
    `영업이익은 ${formatToEokwon(latest.operatingProfit)}로 전년동기 대비 ${formatChangeRate(metrics.yoy.operatingProfitChangeRate)} ${profitTrend}했습니다.`
  );
}
