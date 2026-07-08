import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { resolveChromiumExecutablePath } from '../util/chromium.js';

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1080;

/** HTML 문자열을 1080x1080 PNG 카드뉴스 이미지로 렌더링한다 (FR-06). */
export async function renderHtmlToPng(html, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const executablePath = await resolveChromiumExecutablePath();
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: CARD_WIDTH, height: CARD_HEIGHT });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: outputPath, type: 'png' });
  } finally {
    await browser.close();
  }

  return outputPath;
}
