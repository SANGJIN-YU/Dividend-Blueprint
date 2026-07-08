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
  // 실제 데이터(정)/공백(null)/영업손실(부) 세 가지를 모두 정확히 표현하기 위해
  // 0을 기준선(zeroY)으로 두고 위(양수)/아래(음수)로 막대를 그린다.
  // null 값은 QuickChart(Chart.js)의 null=공백 처리와 동일하게 막대를 그리지 않는다.
  const plotTop = 50;
  const plotBottom = height - padding;
  const negativeReserveRatio = 0.15; // 하단 15%를 음수(영업손실 등) 표현 영역으로 예약
  const zeroY = plotTop + (plotBottom - plotTop) * (1 - negativeReserveRatio);
  const positiveSpan = zeroY - plotTop;
  const negativeSpan = plotBottom - zeroY;

  const definedValues = metrics.quarters
    .flatMap((q) => [q.revenue, q.operatingProfit])
    .filter((v) => v !== null);
  const maxPositive = Math.max(1, ...definedValues.filter((v) => v > 0));
  const maxNegativeAbs = Math.max(1, ...definedValues.filter((v) => v < 0).map((v) => Math.abs(v)));

  const groupWidth = (width - padding * 2) / metrics.quarters.length;
  const barWidth = groupWidth / 3;

  function barRect(x, value, color) {
    if (value === null) return '';
    if (value >= 0) {
      const barHeight = (value / maxPositive) * positiveSpan;
      return `<rect x="${x}" y="${zeroY - barHeight}" width="${barWidth}" height="${barHeight}" fill="${color}" />`;
    }
    const barHeight = (Math.abs(value) / maxNegativeAbs) * negativeSpan;
    return `<rect x="${x}" y="${zeroY}" width="${barWidth}" height="${barHeight}" fill="${color}" />`;
  }

  const bars = metrics.quarters
    .map((q, i) => {
      const groupX = padding + i * groupWidth;
      return `
        ${barRect(groupX + barWidth * 0.5, q.revenue, '#4C6EF5')}
        ${barRect(groupX + barWidth * 1.6, q.operatingProfit, '#12B886')}
        <text x="${groupX + groupWidth / 2}" y="${plotBottom + 24}" font-size="18" text-anchor="middle" fill="#333">${q.label}</text>
      `;
    })
    .join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="white" />
      <text x="${width / 2}" y="30" font-size="22" text-anchor="middle" fill="#222">최근 4개 분기 추이 (최근 공시 기준)</text>
      <line x1="${padding}" y1="${zeroY}" x2="${width - padding}" y2="${zeroY}" stroke="#ccc" stroke-width="1" />
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
