import { selectTopicCompanies } from './src/services/topicSelector.js';
import { runPipelineForCompany } from './src/pipeline.js';
import { logger } from './src/logger.js';
import { config } from './src/config.js';

async function main() {
  logger.info('오늘의 화제 기업 카드뉴스 파이프라인 실행 시작', { mockMode: config.mockMode });

  const companies = await selectTopicCompanies();
  if (companies.length === 0) {
    logger.warn('선정된 화제 기업이 없습니다. (뉴스 언급량/주가 등락률 필터 조건을 확인하세요)');
    return;
  }

  const results = { succeeded: [], failed: [] };

  for (const company of companies) {
    try {
      const { imagePath } = await runPipelineForCompany({
        stockCode: company.stockCode,
        companyName: company.companyName,
      });
      results.succeeded.push({ company: company.companyName, imagePath });
    } catch (error) {
      // 개별 기업 실패가 전체 배치를 막지 않도록 스킵하고 계속 진행한다 (리스크 대응: 데이터 결측 시 자동 스킵).
      logger.error(`${company.companyName} 파이프라인 실패, 스킵합니다`, {
        error: error.message,
        stack: error.stack,
      });
      results.failed.push({ company: company.companyName, error: error.message });
    }
  }

  logger.info('파이프라인 실행 종료', {
    succeededCount: results.succeeded.length,
    failedCount: results.failed.length,
  });

  if (results.failed.length > 0) {
    console.log('\n실패한 기업:');
    for (const f of results.failed) {
      console.log(`  - ${f.company}: ${f.error}`);
    }
  }

  if (results.succeeded.length === 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  logger.error('파이프라인 실행 중 처리되지 않은 오류', { error: error.message, stack: error.stack });
  process.exitCode = 1;
});
