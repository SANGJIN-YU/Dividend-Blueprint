/** 원 단위 금액을 "억원" 기준 문자열로 변환한다 (사람이 읽기 쉬운 카드뉴스 표기용). */
export function formatToEokwon(amountInWon) {
  if (amountInWon === null || amountInWon === undefined) return '데이터 없음';
  const eok = amountInWon / 100_000_000;
  return `${eok.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}억원`;
}

/** 증감률(%) 을 부호 포함 문자열로 변환한다. */
export function formatChangeRate(rate) {
  if (rate === null || rate === undefined) return '데이터 없음';
  const sign = rate > 0 ? '+' : '';
  return `${sign}${rate.toFixed(1)}%`;
}
