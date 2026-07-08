/**
 * 오늘 날짜 기준으로 DART에 공시되어 있을 것으로 기대되는 가장 최근 분기(연/분기)를 추정한다.
 * DART 정기공시 법정 제출기한(사업연도 종료 후 1분기/반기/3분기: 45일, 사업보고서: 90일)을
 * 기준으로 여유(7일)를 더 두고 보수적으로 계산한다.
 * 회사별 실제 공시 시점은 다를 수 있으므로, 조회 시 데이터가 없으면(FR-02) 상위 로직에서 스킵 처리한다.
 */
export function determineLatestAvailableQuarter(now = new Date()) {
  const year = now.getFullYear();
  const deadlines = [
    { year: year - 1, quarter: 4, deadline: new Date(year, 2, 31 + 7) }, // 전년 사업보고서: 3/31 + 여유
    { year, quarter: 1, deadline: new Date(year, 4, 15 + 7) }, // 1분기: 5/15 + 여유
    { year, quarter: 2, deadline: new Date(year, 7, 14 + 7) }, // 반기: 8/14 + 여유
    { year, quarter: 3, deadline: new Date(year, 10, 14 + 7) }, // 3분기: 11/14 + 여유
  ];

  const available = deadlines.filter((d) => d.deadline <= now);
  if (available.length === 0) {
    // 아직 전년 사업보고서도 마감 전인 경우 (예: 1~3월 초) 전전년 사업보고서를 사용
    return { year: year - 2, quarter: 4 };
  }
  const latest = available[available.length - 1];
  return { year: latest.year, quarter: latest.quarter };
}
