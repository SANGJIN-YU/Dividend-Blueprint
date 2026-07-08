import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

/** templates/card-template.html 의 {{KEY}} 플레이스홀더를 data 값으로 치환한다 (FR-06). */
export function renderCardHtml(data) {
  const templatePath = path.join(config.templatesDir, 'card-template.html');
  const template = fs.readFileSync(templatePath, 'utf-8');

  const rawKeys = new Set(['CHART_IMAGE_SRC']);

  return template.replace(/{{\s*([A-Z_]+)\s*}}/g, (match, key) => {
    if (!(key in data)) {
      throw new Error(`템플릿 placeholder ${key} 에 대한 데이터가 없습니다.`);
    }
    const value = String(data[key]);
    return rawKeys.has(key) ? value : escapeHtml(value);
  });
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
