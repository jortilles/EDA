import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import * as fs from 'fs';


const eda_api_config = require('../../../../config/eda_api_config.js');



export class LogController {

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