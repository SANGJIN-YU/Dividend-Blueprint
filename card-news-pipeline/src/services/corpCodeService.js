import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const CORP_CODES_FILE = path.join(config.dataDir, 'corpCodes.json');
const SAMPLE_CORP_CODES_FILE = path.join(config.dataDir, 'fixtures', 'corpCodes.sample.json');

let cache = null;

/**
 * data/corpCodes.json (scripts/updateCorpCodes.js 로 생성) 을 로드한다.
 * 파일이 없으면 (아직 update-corp-codes 를 실행하지 않은 경우) mock/demo 용 샘플로 대체한다.
 */
function loadAll() {
  if (cache) return cache;
  const file = fs.existsSync(CORP_CODES_FILE) ? CORP_CODES_FILE : SAMPLE_CORP_CODES_FILE;
  const raw = fs.readFileSync(file, 'utf-8');
  cache = JSON.parse(raw);
  return cache;
}

/** 종목코드(stock_code) 로 DART corp_code 를 조회한다. */
export function findByStockCode(stockCode) {
  const all = loadAll();
  const found = all.find((entry) => entry.stock_code === stockCode);
  if (!found) {
    throw new Error(`종목코드 ${stockCode} 에 해당하는 corp_code를 찾을 수 없습니다.`);
  }
  return found;
}

export function reloadCache() {
  cache = null;
}
