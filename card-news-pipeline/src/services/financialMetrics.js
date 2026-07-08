import { fetchFinancialStatement, REPORT_CODE } from '../clients/dartClient.js';
import { logger } from '../logger.js';

/**
 * 지표별 DART 계정과목명 후보 (연결/별도, 회사별 표기 차이를 감안해 여러 후보를 매칭한다).
 * NFR: 재무 수치는 DART 원본 값을 그대로 사용하고 임의로 보정/추정하지 않는다.
 * 여기서 하는 "분기 환산"은 DART가 제공하는 누적치를 그대로 뺄셈한 것으로,
 * 값 자체를 추정/보정하는 것이 아니라 공시된 누적 수치 간의 정확한 차분이다.
 */
const ACCOUNTS = {
  revenue: { sjDiv: 'IS', candidates: ['매출액', '수익(매출액)', '영업수익'] },
  operatingProfit: { sjDiv: 'IS', candidates: ['영업이익', '영업이익(손실)'] },
  totalLiabilities: { sjDiv: 'BS', candidates: ['부채총계'] },
  totalEquity: { sjDiv: 'BS', candidates: ['자본총계'] },
};

function parseAmount(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function extractAmount(list, accountKey, field = 'thstrm_amount') {
  const { sjDiv, candidates } = ACCOUNTS[accountKey];
  const item = list.find(
    (row) => row.sj_div === sjDiv && candidates.includes((row.account_nm || '').trim())
  );
  if (!item) return null;
  return parseAmount(item[field]);
}

function reportCodeForQuarter(quarter) {
  return { 1: REPORT_CODE.Q1, 2: REPORT_CODE.HALF, 3: REPORT_CODE.Q3, 4: REPORT_CODE.ANNUAL }[
    quarter
  ];
}

function prevQuarter({ year, quarter }) {
  return quarter === 1 ? { year: year - 1, quarter: 4 } : { year, quarter: quarter - 1 };
}

function quarterLabel({ year, quarter }) {
  return `${year} Q${quarter}`;
}

/**
 * 특정 (year, quarter) 시점까지의 누적 재무제표(list)를 조회한다. 동일 (corpCode, year, quarter)
 * 조합은 파이프라인 한 번 실행 중 여러 번 재사용될 수 있어 캐시한다.
 */
function createReportCache(corpCode, fsDiv) {
  const cache = new Map();
  return async function getCumulativeReport(year, quarter) {
    const key = `${year}-${quarter}`;
    if (cache.has(key)) return cache.get(key);
    const list = await fetchFinancialStatement({
      corpCode,
      bsnsYear: year,
      reprtCode: reportCodeForQuarter(quarter),
      fsDiv,
    });
    cache.set(key, list);
    return list;
  };
}

/**
 * endYear/endQuarter 를 포함해 직전 4개 분기의 단일(비누적) 매출액/영업이익을
 * DART 누적 공시 값의 차분으로 계산하고, 부채비율과 YoY/QoQ 증감률을 함께 반환한다. (FR-03)
 */
export async function fetchQuarterlyMetrics({ corpCode, endYear, endQuarter, fsDiv = 'CFS' }) {
  const getCumulativeReport = createReportCache(corpCode, fsDiv);

  const targetQuarters = [];
  let cursor = { year: endYear, quarter: endQuarter };
  for (let i = 0; i < 4; i += 1) {
    targetQuarters.unshift(cursor);
    cursor = prevQuarter(cursor);
  }

  const quarters = [];
  for (const point of targetQuarters) {
    const currentList = await getCumulativeReport(point.year, point.quarter);
    const currentRevenue = extractAmount(currentList, 'revenue');
    const currentOperatingProfit = extractAmount(currentList, 'operatingProfit');

    let standaloneRevenue = currentRevenue;
    let standaloneOperatingProfit = currentOperatingProfit;

    if (point.quarter !== 1) {
      const prior = prevQuarter(point);
      const priorList = await getCumulativeReport(prior.year, prior.quarter);
      const priorRevenue = extractAmount(priorList, 'revenue');
      const priorOperatingProfit = extractAmount(priorList, 'operatingProfit');
      standaloneRevenue =
        currentRevenue !== null && priorRevenue !== null ? currentRevenue - priorRevenue : null;
      standaloneOperatingProfit =
        currentOperatingProfit !== null && priorOperatingProfit !== null
          ? currentOperatingProfit - priorOperatingProfit
          : null;
    }

    if (standaloneRevenue === null || standaloneOperatingProfit === null) {
      logger.warn('분기 재무 데이터 일부 결측', { corpCode, point });
    }

    quarters.push({
      label: quarterLabel(point),
      revenue: standaloneRevenue,
      operatingProfit: standaloneOperatingProfit,
    });
  }

  const latestList = await getCumulativeReport(endYear, endQuarter);
  const totalLiabilities = extractAmount(latestList, 'totalLiabilities');
  const totalEquity = extractAmount(latestList, 'totalEquity');
  // totalEquity === 0(실제 값)과 totalEquity === null(결측)을 구분한다.
  // 0으로 나누기만 별도로 방지하고, 음수 자본(자본잠식) 등 다른 실제 값은 그대로 계산한다.
  const debtRatio =
    totalLiabilities !== null && totalEquity !== null && totalEquity !== 0
      ? (totalLiabilities / totalEquity) * 100
      : null;

  const cumulativeRevenueThis = extractAmount(latestList, 'revenue', 'thstrm_amount');
  const cumulativeRevenuePrior = extractAmount(latestList, 'revenue', 'frmtrm_amount');
  const cumulativeOperatingProfitThis = extractAmount(latestList, 'operatingProfit', 'thstrm_amount');
  const cumulativeOperatingProfitPrior = extractAmount(
    latestList,
    'operatingProfit',
    'frmtrm_amount'
  );

  const yoy = {
    revenueChangeRate: changeRate(cumulativeRevenueThis, cumulativeRevenuePrior),
    operatingProfitChangeRate: changeRate(cumulativeOperatingProfitThis, cumulativeOperatingProfitPrior),
  };

  const latestQuarter = quarters[quarters.length - 1];
  const previousQuarter = quarters[quarters.length - 2];
  const qoq = {
    revenueChangeRate: changeRate(latestQuarter.revenue, previousQuarter.revenue),
    operatingProfitChangeRate: changeRate(
      latestQuarter.operatingProfit,
      previousQuarter.operatingProfit
    ),
  };

  return {
    asOf: { year: endYear, quarter: endQuarter },
    quarters,
    debtRatio,
    yoy,
    qoq,
  };
}

function changeRate(current, prior) {
  if (current === null || prior === null || prior === 0) return null;
  return ((current - prior) / Math.abs(prior)) * 100;
}
