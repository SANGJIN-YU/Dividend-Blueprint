import fs from 'node:fs';
import path from 'node:path';
import { install, computeExecutablePath, Browser, resolveBuildId } from '@puppeteer/browsers';
import { config } from '../config.js';
import { logger } from '../logger.js';

const AUTO_INSTALL_CACHE_DIR = path.join(config.rootDir, '.chromium-cache');

/**
 * Puppeteer 실행용 Chromium 실행 파일 경로를 결정한다.
 * 1) PUPPETEER_EXECUTABLE_PATH 등 config에 지정된 경로가 실제로 존재하면 그대로 사용 (예: 이 샌드박스에 미리 설치된 Chromium).
 * 2) 없으면 @puppeteer/browsers 로 Chromium을 자동 설치하고 그 경로를 사용한다 (예: 일반 CI 환경).
 */
export async function resolveChromiumExecutablePath() {
  const configured = config.puppeteer.executablePath;
  if (configured && fs.existsSync(configured)) {
    return configured;
  }

  logger.warn('설정된 PUPPETEER_EXECUTABLE_PATH를 찾을 수 없어 Chromium을 자동 설치합니다', {
    configured,
  });

  const buildId = await resolveBuildId(Browser.CHROME, 'linux', 'stable');
  const existingPath = tryComputeExecutablePath(buildId);
  if (existingPath && fs.existsSync(existingPath)) {
    return existingPath;
  }

  await install({
    cacheDir: AUTO_INSTALL_CACHE_DIR,
    browser: Browser.CHROME,
    buildId,
  });

  return computeExecutablePath({
    cacheDir: AUTO_INSTALL_CACHE_DIR,
    browser: Browser.CHROME,
    buildId,
  });
}

function tryComputeExecutablePath(buildId) {
  try {
    return computeExecutablePath({
      cacheDir: AUTO_INSTALL_CACHE_DIR,
      browser: Browser.CHROME,
      buildId,
    });
  } catch {
    return null;
  }
}
