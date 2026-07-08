import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { withRetry } from '../util/retry.js';

/** 분기/반기/사업보고서 구분 코드 (DART 명세) */
export const REPORT_CODE = {
  Q1: '11013',
  HALF: '11012',
  Q3: '11014',
  ANNUAL: '11011',
};

/**
 * DART Open API 단일회사 전체 재무제표 조회.
 * https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json
 * MOCK_MODE=true 인 경우 data/fixtures/financialStatements.json 에서 읽어온다.
 */
export async function fetchFinancialStatement({
  corpCode,
  bsnsYear,
  reprtCode,
  fsDiv = 'CFS',
}) {
  if (config.mockMode) {
    return loadMockStatement({ corpCode, bsnsYear, reprtCode });
  }

  if (!config.dart.apiKey) {
    throw new Error('DART_API_KEY가 설정되지 않았습니다. .env를 확인하세요.');
  }

  return withRetry(`DART fnlttSinglAcntAll(${corpCode}, ${bsnsYear}, ${reprtCode})`, async () => {
    const url = new URL(`${config.dart.baseUrl}/fnlttSinglAcntAll.json`);
    url.searchParams.set('crtfc_key', config.dart.apiKey);
    url.searchParams.set('corp_code', corpCode);
    url.searchParams.set('bsns_year', String(bsnsYear));
    url.searchParams.set('reprt_code', reprtCode);
    url.searchParams.set('fs_div', fsDiv);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`DART API HTTP 오류: ${response.status}`);
    }
    const body = await response.json();

    if (body.status === '013') {
      // 해당 분기/보고서에 대해 조회된 데이터가 없음 (예: 아직 공시 전)
      return [];
    }
    if (body.status !== '000') {
      throw new Error(`DART API 오류 (${body.status}): ${body.message}`);
    }
    return body.list ?? [];
  });
}

function loadMockStatement({ corpCode, bsnsYear, reprtCode }) {
  const file = path.join(config.dataDir, 'fixtures', 'financialStatements.json');
  const fixture = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const key = `${corpCode}-${bsnsYear}-${reprtCode}`;
  return fixture[key] ?? [];
}
