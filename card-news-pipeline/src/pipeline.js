import fs from 'node:fs';
import path from 'node:path';
import { findByStockCode } from './services/corpCodeService.js';
import { fetchQuarterlyMetrics } from './services/financialMetrics.js';
import { generateNarrative } from './services/narrativeGenerator.js';
import { buildQuarterlyChartImageSrc } from './services/chartGenerator.js';
import { renderCardHtml } from './services/templateRenderer.js';
import { renderHtmlToPng } from './services/imageRenderer.js';
import { determineLatestAvailableQuarter } from './util/reportPeriod.js';
import { formatChangeRate } from './util/format.js';
import { config } from './config.js';
import { logger } from './logger.js';

function todayDateStamp() {
  return new Date().toISOString().slice(0, 10).replaceAll('-', '');
}

/**
 * 한 기업에 대해 데이터 수집 → 지표 가공 → 서사 생성 → 차트 → 렌더링까지 전체 파이프라인을 실행하고
 * 검수용 산출물(이미지 + 원본 데이터 JSON)을 output/{종목코드}_{날짜}/ 에 저장한다 (FR-02~FR-07).
 */
export async function runPipelineForCompany({ stockCode, companyName }) {
  logger.info(`파이프라인 시작: ${companyName} (${stockCode})`);

  const corp = findByStockCode(stockCode);
  const { year, quarter } = determineLatestAvailableQuarter();

  const metrics = await fetchQuarterlyMetrics({
    corpCode: corp.corp_code,
    endYear: year,
    endQuarter: quarter,
  });

  // 차트에는 4개 분기가 모두 표시되므로, 최신 분기뿐 아니라 모든 분기의 데이터가
  // 있어야 결측치가 없는 것으로 본다 (그렇지 않으면 이전 분기 결측이 차트에 0으로 표시될 수 있음).
  const hasRequiredData = metrics.quarters.every(
    (q) => q.revenue !== null && q.operatingProfit !== null
  );
  if (!hasRequiredData) {
    throw new Error(`${companyName} 필수 재무 지표 결측으로 스킵합니다 (${year} Q${quarter})`);
  }

  const narrative = await generateNarrative({ companyName, metrics });
  const chartImageSrc = buildQuarterlyChartImageSrc(metrics);

  const html = renderCardHtml({
    COMPANY_NAME: companyName,
    AS_OF_LABEL: `${year}년 ${quarter}분기`,
    NARRATIVE: narrative,
    CHART_IMAGE_SRC: chartImageSrc,
    REVENUE_YOY: formatChangeRate(metrics.yoy.revenueChangeRate),
    OPERATING_PROFIT_YOY: formatChangeRate(metrics.yoy.operatingProfitChangeRate),
    DEBT_RATIO: metrics.debtRatio !== null ? `${metrics.debtRatio.toFixed(1)}%` : '데이터 없음',
  });

  const dateStamp = todayDateStamp();
  const folderName = `${stockCode}_${dateStamp}`;
  const outputFolder = path.join(config.outputDir, folderName);
  const imagePath = path.join(outputFolder, `${stockCode}_${dateStamp}.png`);
  const dataPath = path.join(outputFolder, `${stockCode}_${dateStamp}.json`);

  await renderHtmlToPng(html, imagePath);

  fs.mkdirSync(outputFolder, { recursive: true });
  fs.writeFileSync(
    dataPath,
    JSON.stringify(
      {
        stockCode,
        companyName,
        corpCode: corp.corp_code,
        asOf: { year, quarter },
        metrics,
        narrative,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  logger.info(`파이프라인 완료: ${companyName} (${stockCode})`, { imagePath, dataPath });

  return { imagePath, dataPath };
}
