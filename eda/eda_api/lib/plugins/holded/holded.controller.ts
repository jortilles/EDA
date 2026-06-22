import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../module/global/model/index';
import { HoldedApiService } from './holded-api.service';
import * as path from 'path';

export class HoldedController {

    static async downloadData(req: Request, res: Response, next: NextFunction) {
        try {
            const { apiKey, folderName, dateFrom, dateTo } = req.body;

            if (!apiKey || !folderName) {
                return next(new HttpException(400, 'Se requieren los campos: apiKey, folderName'));
            }

            const folderPath = path.join(process.cwd(), 'duckdb', folderName);

            const result = await HoldedApiService.downloadToFolder(
                { apiKey, dateFrom, dateTo },
                folderPath
            );

            return res.status(200).json({
                ok: true,
                message: [
                    `${result.invoices} facturas`,
                    `${result.lines} líneas`,
                    `${result.contacts} contactos`,
                    `${result.products} productos`,
                    `${result.ledgerEntries} asientos contables`
                ].join(' · '),
                counts: result,
                files: [
                    `duckdb/${folderName}/facturas.csv`,
                    `duckdb/${folderName}/facturas_lineas.csv`,
                    `duckdb/${folderName}/contactos.csv`,
                    `duckdb/${folderName}/productos.csv`,
                    `duckdb/${folderName}/asientos.csv`
                ]
            });

        } catch (err: any) {
            console.error('[Holded] Error:', err.message);
            return next(new HttpException(500, `Error descargando datos de Holded: ${err.message}`));
        }
    }
}
