import * as fs from 'fs';
import * as path from 'path';

// SDA CUSTOM - Daily file logger without external runtime dependencies (10-day retention)
const LOG_RETENTION_DAYS = 10;
const LOG_DIR_PATH = path.resolve(process.cwd(), 'logs');
const APP_LOG_PATTERN = /^app-(\d{4}-\d{2}-\d{2})\.log$/;

function ensureLogsDirectory() {
  if (!fs.existsSync(LOG_DIR_PATH)) fs.mkdirSync(LOG_DIR_PATH, { recursive: true });
}

function formatTodayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDailyLogPath() {
  const todayKey = formatTodayKey(new Date());
  return path.join(LOG_DIR_PATH, `app-${todayKey}.log`);
}

function pruneOldDailyLogs() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - (LOG_RETENTION_DAYS - 1));

  fs.readdirSync(LOG_DIR_PATH).forEach(fileName => {
    const match = fileName.match(APP_LOG_PATTERN);
    if (!match) return;
    const parsedDate = new Date(`${match[1]}T00:00:00`);
    if (isNaN(parsedDate.getTime())) return;
    if (parsedDate < cutoffDate) {
      try {
        fs.unlinkSync(path.join(LOG_DIR_PATH, fileName));
      } catch (error) {
        // Intentionally ignore pruning errors to avoid breaking request flow
      }
    }
  });
}

function sanitizeField(value: any) {
  return (value || '').toString().replace(/\r|\n/g, ' ').replace(/\|,\|/g, ' ');
}

const ServerLogSdaService = {
  log(payload: any) {
    ensureLogsDirectory();
    pruneOldDailyLogs();
    const row = [
      sanitizeField(payload && payload.level),
      sanitizeField(payload && payload.action),
      sanitizeField(payload && payload.userMail),
      sanitizeField(payload && payload.ip),
      sanitizeField(payload && payload.type),
      sanitizeField(payload && payload.date_str)
    ].join('|,|');
    fs.appendFileSync(getDailyLogPath(), `${row}\n`, { encoding: 'utf8' });
  }
};
// END SDA CUSTOM

export default ServerLogSdaService;
