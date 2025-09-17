import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import * as fs from 'fs';


const eda_api_config = require('../../../../config/eda_api_config.js');



export class LogController {


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