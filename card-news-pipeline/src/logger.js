import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

function todayLogFile() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(config.logsDir, `pipeline-${date}.log`);
}

function write(level, message, meta) {
  fs.mkdirSync(config.logsDir, { recursive: true });
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  const line = `${JSON.stringify(entry)}\n`;
  fs.appendFileSync(todayLogFile(), line);
  const consoleFn = level === 'error' ? console.error : console.log;
  consoleFn(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`, meta ?? '');
}

export const logger = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
