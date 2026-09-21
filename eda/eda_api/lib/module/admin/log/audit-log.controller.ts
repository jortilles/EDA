import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export class AuditLogController {

    static async getAppLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const logsDirectoryPath = path.resolve(__dirname, '../../../../logs');
            const qs: any = (req as any).qs || {};
            const { date, startDate, endDate } = qs;

            if (!fs.existsSync(logsDirectoryPath)) {
                return res.status(200).json([]);
            }
            const requestedLimitRaw = qs.limit;
            const hasRequestedLimit = requestedLimitRaw !== undefined && requestedLimitRaw !== null && requestedLimitRaw !== '';
            const requestedLimit = Number(requestedLimitRaw);
            const safeLimit = hasRequestedLimit && Number.isFinite(requestedLimit) ? Math.max(1, Math.min(20000, requestedLimit)) : 0;
            const requestedStartDate = date ? date.toString() : (startDate ? startDate.toString() : undefined);
            const requestedEndDate = date ? date.toString() : (endDate ? endDate.toString() : undefined);
            // Read all files that may contain the requested range, to guarantee visibility across rotated logs
            const logFiles = resolveAppLogFiles(logsDirectoryPath, requestedStartDate, requestedEndDate);
            if (logFiles.length === 0) {
                return res.status(200).json([]);
            }
            const rawContent = logFiles.map(filePath => readFileSafely(filePath)).join('\n');
            const lines = rawContent.split('\n');
            const logs = lines
                .filter(line => line.trim() !== '')
                .map(line => {
                    const parts = line.split('|,|');
                    return {
                        level: parts[0]?.trim(),
                        action: parts[1]?.trim(),
                        userMail: parts[2]?.trim(),
                        ip: parts[3]?.trim(),
                        type: parts[4]?.trim(),
                        date_str: parts[5]?.trim()
                    };
                });

            let filteredLogs = logs;
            if (date) {
                filteredLogs = logs.filter(log => log.date_str && log.date_str.startsWith(date.toString()));
            } else if (startDate || endDate) {
                filteredLogs = logs.filter(log => {
                    if (!log.date_str) return false;
                    const logDate = log.date_str.split(' ')[0];
                    if (startDate && logDate < startDate) return false;
                    if (endDate && logDate > endDate) return false;
                    return true;
                });
            }

            filteredLogs = filteredLogs.sort((a, b) => {
                const dateA = new Date((a?.date_str || '').replace(' ', 'T')).getTime();
                const dateB = new Date((b?.date_str || '').replace(' ', 'T')).getTime();
                return dateB - dateA;
            });

            return res.status(200).json(safeLimit > 0 ? filteredLogs.slice(0, safeLimit) : filteredLogs);
        } catch (err) {
            next(err);
        }
    }
}

// Resolve application log files (daily-named + winston-rotated + current) within the requested date range
function resolveAppLogFiles(logsDirectoryPath: string, startDate?: string, endDate?: string): string[] {
    const fileNames = fs.readdirSync(logsDirectoryPath);
    const selectedFiles: string[] = [];

    fileNames.forEach(fileName => {
        const dailyMatch = fileName.match(/^app-(\d{4}-\d{2}-\d{2})\.log(?:\.\d+)?$/);
        if (dailyMatch) {
            const logDate = dailyMatch[1];
            if (startDate && logDate < startDate) return;
            if (endDate && logDate > endDate) return;
            selectedFiles.push(path.join(logsDirectoryPath, fileName));
            return;
        }

        // winston's non-tailable rotation names files app1.log..app4.log (no dot before the index), plus the current app.log
        if (/^app\d*\.log$/.test(fileName)) {
            selectedFiles.push(path.join(logsDirectoryPath, fileName));
        }
    });

    // mtime, not filename, determines recency here since winston reuses low indices for the newest rotated file
    return selectedFiles.sort((firstPath, secondPath) => {
        const firstMtime = fs.statSync(firstPath).mtime.getTime();
        const secondMtime = fs.statSync(secondPath).mtime.getTime();
        return firstMtime - secondMtime;
    });
}

// Read file content safely so one unreadable rotated file doesn't break the whole response
function readFileSafely(filePath: string): string {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return '';
    }
}
