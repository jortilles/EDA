import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import * as fs from 'fs';
import * as path from 'path';


const eda_api_config = require('../../../../config/eda_api_config.js');



export class LogController {

    // Combines log_file's rotated daily archives (from LogRotationService) plus today's live file
    // into one chronological read, for the Periodo/Fecha filters in "Consola del servidor".
    static async getLogHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const qs: any = (req as any).qs || {};
            const logFilePath = eda_api_config.log_file;
            const { date, startDate, endDate } = qs;
            const requestedStart = date ? date.toString() : (startDate ? startDate.toString() : undefined);
            const requestedEnd = date ? date.toString() : (endDate ? endDate.toString() : undefined);

            const files = logFilePath ? resolveDatedLogFiles(logFilePath, requestedStart, requestedEnd) : [];
            const content = files.map(filePath => readFileSafely(filePath)).join('');

            const todayStr = formatDateYYYYMMDD(new Date());
            const endsToday = !requestedEnd || requestedEnd >= todayStr;

            let offset = 0, size = 0;
            if (logFilePath && fs.existsSync(logFilePath)) {
                size = fs.statSync(logFilePath).size;
                offset = size;
            }

            return res.status(200).json({ content, offset, size, endsToday });
        } catch (err) {
            next(err);
        }
    }

    static async getLogTail(req: Request, res: Response, next: NextFunction) {
        try {
            const qs: any = (req as any).qs || {};
            const logFilePath = qs.file === 'error' ? eda_api_config.error_log_file : eda_api_config.log_file;

            if (!fs.existsSync(logFilePath)) {
                return res.status(200).json({ content: '', offset: 0, size: 0, reset: true });
            }

            const size = fs.statSync(logFilePath).size;
            const requestedOffset = Number(qs.offset);
            // Requested offset beyond current size means the file was rotated/truncated since the last poll
            const reset = !Number.isFinite(requestedOffset) || requestedOffset < 0 || requestedOffset > size;
            const start = reset ? 0 : requestedOffset;

            if (start === size) {
                return res.status(200).json({ content: '', offset: size, size, reset: false });
            }

            const content = await readFileRange(logFilePath, start, size);
            return res.status(200).json({ content, offset: size, size, reset });
        } catch (err) {
            next(err);
        }
    }


    static async getLogFile(req: Request, res: Response, next: NextFunction) {

        try {
            // Directorio Actual : Es el  directorio donde se encuentra el archivo principal
            const logFilePath = eda_api_config.log_file;  

            // Leer el archivo de logs
            fs.readFile(logFilePath, 'utf8', (err, data) => {
                if(err){
                    console.error('Error al leer el archivo de log:', err);
                    return next(new HttpException(500, 'Error no se puede leer el archivo del log'));
                }
                return res.status(200).json({ content: data });
            })

            // return res.status(200).json(saludo);

        } catch (err) {
            next(err);
        }
    }

    static async getLogErrorFile(req: Request, res: Response, next: NextFunction) {

        try {
            // Directorio Actual : Es el  directorio donde se encuentra el archivo principal
            const logFilePath = eda_api_config.error_log_file;  

            // Leer el archivo de logs
            fs.readFile(logFilePath, 'utf8', (err, data) => {
                if(err){
                    console.error('Error al leer el archivo de log:', err);
                    return next(new HttpException(500, 'Error no se puede leer el archivo del log'));
                }
                return res.status(200).json({ content: data });
            })

            // return res.status(200).json(saludo);

        } catch (err) {
            next(err);
        }
    }
}

// Read only the bytes appended since the last known offset, for incremental log polling
function readFileRange(filePath: string, start: number, end: number): Promise<string> {
    return new Promise((resolve, reject) => {
        if (start >= end) return resolve('');
        const chunks: string[] = [];
        const stream = fs.createReadStream(filePath, { start, end: end - 1, encoding: 'utf8' });
        stream.on('data', (chunk) => chunks.push(chunk.toString()));
        stream.on('end', () => resolve(chunks.join('')));
        stream.on('error', reject);
    });
}

// Finds LogRotationService's dated archives (<base>-YYYY-MM-DD<ext>) within range, oldest first,
// plus today's live file appended last when the range reaches today.
function resolveDatedLogFiles(logFilePath: string, startDate?: string, endDate?: string): string[] {
    const dir = path.dirname(logFilePath);
    if (!fs.existsSync(dir)) return [];

    const ext = path.extname(logFilePath);
    const base = path.basename(logFilePath, ext);
    const datedPattern = new RegExp(`^${escapeRegExp(base)}-(\\d{4}-\\d{2}-\\d{2})${escapeRegExp(ext)}$`);

    const matched: { filePath: string, dateStr: string }[] = [];
    fs.readdirSync(dir).forEach(fileName => {
        const match = fileName.match(datedPattern);
        if (!match) return;
        const dateStr = match[1];
        if (startDate && dateStr < startDate) return;
        if (endDate && dateStr > endDate) return;
        matched.push({ filePath: path.join(dir, fileName), dateStr });
    });
    matched.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    const orderedPaths = matched.map(m => m.filePath);
    const todayStr = formatDateYYYYMMDD(new Date());
    const includesToday = (!startDate || todayStr >= startDate) && (!endDate || todayStr <= endDate);
    if (includesToday && fs.existsSync(logFilePath)) {
        orderedPaths.push(logFilePath);
    }
    return orderedPaths;
}

function readFileSafely(filePath: string): string {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        return '';
    }
}

function formatDateYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}