import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT_DIR, '.env') });

function toBool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true';
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  rootDir: ROOT_DIR,
  outputDir: path.join(ROOT_DIR, 'output'),
  logsDir: path.join(ROOT_DIR, 'logs'),
  dataDir: path.join(ROOT_DIR, 'data'),
  templatesDir: path.join(ROOT_DIR, 'templates'),

  mockMode: toBool(process.env.MOCK_MODE, false),

  dart: {
    apiKey: process.env.DART_API_KEY || '',
    baseUrl: 'https://opendart.fss.or.kr/api',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
  },

  news: {
    apiKey: process.env.NEWS_API_KEY || '',
    provider: process.env.NEWS_API_PROVIDER || 'mock',
  },

  stock: {
    apiKey: process.env.STOCK_API_KEY || '',
    provider: process.env.STOCK_API_PROVIDER || 'mock',
  },

  topicCompanyCount: toNumber(process.env.TOPIC_COMPANY_COUNT, 3),
  minAbsPriceChangeRate: toNumber(process.env.MIN_ABS_PRICE_CHANGE_RATE, 1.5),

  puppeteer: {
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  },

  retry: {
    maxAttempts: 2,
  },
};
