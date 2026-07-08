import { config } from '../config.js';

const QUICKCHART_BASE_URL = 'https://quickchart.io/chart';

/**
 * 최근 4개 분기 매출액/영업이익 추이 차트 이미지 URL(또는 데이터 URI)을 생성한다 (FR-05).
 * 실제 모드에서는 QuickChart 에 Chart.js 설정을 넘겨 이미지 URL을 만들고,
 * 렌더링(Puppeteer) 단계에서 해당 URL을 그대로 <img src> 로 사용해 네트워크에서 가져오게 한다.
 * MOCK_MODE 에서는 외부 네트워크 호출 없이 동일한 데이터로 인라인 SVG를 직접 그려 사용한다.
 */
export function buildQuarterlyChartImageSrc(metrics) {
  if (config.mockMode) {
    return buildInlineSvgChart(metrics);
  }
  return buildQuickChartUrl(metrics);
}

function buildQuickChartUrl(metrics) {
  const labels = metrics.quarters.map((q) => q.label);
  const chartConfig = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '매출액(원)',
          data: metrics.quarters.map((q) => q.revenue),
          backgroundColor: '#4C6EF5',
        },
        {
          label: '영업이익(원)',
          data: metrics.quarters.map((q) => q.operatingProfit),
          backgroundColor: '#12B886',
        },
      ],
    },
    options: {
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: '최근 4개 분기 추이 (최근 공시 기준)' },
      },
    },
  };

  const url = new URL(QUICKCHART_BASE_URL);
  url.searchParams.set('c', JSON.stringify(chartConfig));
  url.searchParams.set('width', '900');
  url.searchParams.set('height', '400');
  url.searchParams.set('backgroundColor', 'white');
  return url.toString();
}

function buildInlineSvgChart(metrics) {
  const width = 900;
  const height = 400;
  const padding = 60;
  const values = metrics.quarters.flatMap((q) => [q.revenue ?? 0, q.operatingProfit ?? 0]);
  const maxValue = Math.max(1, ...values);
  const groupWidth = (width - padding * 2) / metrics.quarters.length;
  const barWidth = groupWidth / 3;

  const bars = metrics.quarters
    .map((q, i) => {
      const groupX = padding + i * groupWidth;
      const revenueHeight = ((q.revenue ?? 0) / maxValue) * (height - padding * 2);
      const profitHeight = ((q.operatingProfit ?? 0) / maxValue) * (height - padding * 2);
      const revenueY = height - padding - revenueHeight;
      const profitY = height - padding - profitHeight;
      return `
        <rect x="${groupX + barWidth * 0.5}" y="${revenueY}" width="${barWidth}" height="${revenueHeight}" fill="#4C6EF5" />
        <rect x="${groupX + barWidth * 1.6}" y="${profitY}" width="${barWidth}" height="${profitHeight}" fill="#12B886" />
        <text x="${groupX + groupWidth / 2}" y="${height - padding + 24}" font-size="18" text-anchor="middle" fill="#333">${q.label}</text>
      `;
    })
    .join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="white" />
      <text x="${width / 2}" y="30" font-size="22" text-anchor="middle" fill="#222">최근 4개 분기 추이 (최근 공시 기준)</text>
      ${bars}
      <rect x="${width - 260}" y="14" width="14" height="14" fill="#4C6EF5" />
      <text x="${width - 240}" y="26" font-size="16" fill="#333">매출액</text>
      <rect x="${width - 150}" y="14" width="14" height="14" fill="#12B886" />
      <text x="${width - 130}" y="26" font-size="16" fill="#333">영업이익</text>
    </svg>
  `.trim();

  const base64 = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}
