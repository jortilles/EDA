import * as fs from 'fs';
import * as path from 'path';

const eda_api_config = require('../../../config/eda_api_config.js');

export class LogRotationService {

    // Archives yesterday's content of log_file under a dated name, then empties the original in place
    // (never renamed/deleted) so the process already writing to it — e.g. PM2, in append mode — keeps
    // writing correctly to the same path without needing to reopen its file handle.
    static rotateAccessLog() {
        const logFilePath = eda_api_config.log_file;
        if (!logFilePath || !fs.existsSync(logFilePath)) return;
        if (fs.statSync(logFilePath).size === 0) return;

        const datedPath = buildDatedArchivePath(logFilePath, yesterdayDateStr());
        // Guard against rotating twice for the same day (e.g. a server restart shortly after midnight)
        if (fs.existsSync(datedPath)) return;

        try {
            fs.copyFileSync(logFilePath, datedPath);
            fs.truncateSync(logFilePath, 0);
        } catch (err) {
            console.error('Error rotating access log file:', err);
        }
    }
}

function yesterdayDateStr(): string {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function buildDatedArchivePath(logFilePath: string, dateStr: string): string {
    const dir = path.dirname(logFilePath);
    const ext = path.extname(logFilePath);
    const base = path.basename(logFilePath, ext);
    return path.join(dir, `${base}-${dateStr}${ext}`);
}
