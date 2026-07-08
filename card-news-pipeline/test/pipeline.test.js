import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

process.env.MOCK_MODE = 'true';

const { fetchQuarterlyMetrics } = await import('../src/services/financialMetrics.js');
const { selectTopicCompanies } = await import('../src/services/topicSelector.js');
const { runPipelineForCompany } = await import('../src/pipeline.js');
const { config } = await import('../src/config.js');

test('fetchQuarterlyMetrics computes standalone quarters and change rates from fixtures', async () => {
  const metrics = await fetchQuarterlyMetrics({
    corpCode: '00000001',
    endYear: 2026,
    endQuarter: 1,
  });

  assert.equal(metrics.quarters.length, 4);
  assert.deepEqual(
    metrics.quarters.map((q) => q.label),
    ['2025 Q2', '2025 Q3', '2025 Q4', '2026 Q1']
  );

  // 2025 Q3 표준화 매출 = 9.5조 누적 - 6.2조 누적 = 3.3조
  assert.equal(metrics.quarters[1].revenue, 3_300_000_000_000);
  // 2026 Q1 표준화 매출 = 3.3조 (1분기라 누적=단일)
  assert.equal(metrics.quarters[3].revenue, 3_300_000_000_000);

  assert.equal(metrics.debtRatio, 50);
  assert.ok(metrics.yoy.revenueChangeRate > 0);
});

test('selectTopicCompanies filters by price change threshold and sorts by mentions', async () => {
  const selected = await selectTopicCompanies({ count: 5, minAbsChangeRate: 1.5 });
  // 000003 (샘플플랫폼) has |0.4%| change < 1.5 threshold, should be filtered out
  assert.ok(!selected.some((c) => c.stockCode === '000003'));
  assert.ok(selected.length > 0);
});

test('runPipelineForCompany produces a PNG + review JSON in mock mode', async () => {
  const { imagePath, dataPath } = await runPipelineForCompany({
    stockCode: '000001',
    companyName: '샘플전자',
  });

  assert.ok(fs.existsSync(imagePath), 'PNG 카드뉴스 이미지가 생성되어야 합니다');
  assert.ok(fs.existsSync(dataPath), '검수용 JSON이 생성되어야 합니다');

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  assert.equal(data.stockCode, '000001');
  assert.ok(data.narrative.length > 0);

  // cleanup
  fs.rmSync(path.dirname(imagePath), { recursive: true, force: true });
});
