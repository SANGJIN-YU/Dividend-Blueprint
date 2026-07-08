/**
 * 오늘 날짜 기준으로 DART에 공시되어 있을 것으로 기대되는 가장 최근 분기(연/분기)를 추정한다.
 * DART 정기공시 법정 제출기한(사업연도 종료 후 1분기/반기/3분기: 45일, 사업보고서: 90일)을
 * 기준으로 여유(7일)를 더 두고 보수적으로 계산한다.
 * 회사별 실제 공시 시점은 다를 수 있으므로, 조회 시 데이터가 없으면(FR-02) 상위 로직에서 스킵 처리한다.
 */
function quarterDeadline(year, quarter) {
  if (quarter === 1) return new Date(year, 4, 15 + 7); // 1분기: 5/15 + 여유
  if (quarter === 2) return new Date(year, 7, 14 + 7); // 반기: 8/14 + 여유
  if (quarter === 3) return new Date(year, 10, 14 + 7); // 3분기: 11/14 + 여유
  return new Date(year + 1, 2, 31 + 7); // 사업보고서(4분기): 익년 3/31 + 여유
}

export function determineLatestAvailableQuarter(now = new Date()) {
  const year = now.getFullYear();

  // 최근 3개 연도의 분기별 마감일을 모두 계산해, 연말~익년 초 사이(작년 4분기는 아직인데
  // 작년 1~3분기는 이미 공시된 구간)에도 올바른 최신 분기를 찾을 수 있도록 한다.
  const candidates = [];
  for (const y of [year - 2, year - 1, year]) {
    for (const quarter of [1, 2, 3, 4]) {
      candidates.push({ year: y, quarter, deadline: quarterDeadline(y, quarter) });
    }
  }

  const available = candidates.filter((c) => c.deadline <= now);
  if (available.length === 0) {
    // 사실상 도달하지 않는 방어적 폴백 (3년치 후보 중 하나도 마감 전인 경우)
    return { year: year - 3, quarter: 4 };
  }
  available.sort((a, b) => a.deadline - b.deadline);
  const latest = available[available.length - 1];
  return { year: latest.year, quarter: latest.quarter };
}
