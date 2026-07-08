#!/usr/bin/env node
// DART Open API의 corpCode.xml(전체 상장/공시대상 회사의 고유번호) 을 내려받아
// 종목코드가 있는(상장) 회사만 필터링해 data/corpCodes.json 으로 저장한다. (FR-02 사전 준비)
import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import { config } from '../src/config.js';
import { logger } from '../src/logger.js';

async function main() {
  if (!config.dart.apiKey) {
    throw new Error('DART_API_KEY가 설정되지 않았습니다. .env를 확인하세요.');
  }

  const url = new URL(`${config.dart.baseUrl}/corpCode.xml`);
  url.searchParams.set('crtfc_key', config.dart.apiKey);

  logger.info('DART corpCode.xml 다운로드 시작');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`corpCode.xml 다운로드 실패: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  const zip = new AdmZip(buffer);
  const entry = zip.getEntries().find((e) => e.entryName.toUpperCase() === 'CORPCODE.XML');
  if (!entry) {
    throw new Error('zip 안에서 CORPCODE.xml 항목을 찾을 수 없습니다.');
  }
  const xml = entry.getData().toString('utf-8');

  // parseTagValue: false 로 값 자동 숫자/불리언 변환을 꺼서 "005930" 같은 0으로 시작하는
  // stock_code/corp_code 가 숫자로 변환되어 앞자리 0이 사라지는 것을 방지한다.
  const parser = new XMLParser({ parseTagValue: false });
  const parsed = parser.parse(xml);
  const list = parsed?.result?.list ?? [];

  const listed = list
    .filter((item) => typeof item.stock_code === 'string' && item.stock_code.trim() !== '')
    .map((item) => ({
      corp_code: String(item.corp_code),
      corp_name: String(item.corp_name),
      stock_code: String(item.stock_code),
    }));

  fs.mkdirSync(config.dataDir, { recursive: true });
  const outFile = path.join(config.dataDir, 'corpCodes.json');
  fs.writeFileSync(outFile, JSON.stringify(listed, null, 2));

  logger.info(`corpCodes.json 저장 완료 (${listed.length}개 상장사)`, { outFile });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
