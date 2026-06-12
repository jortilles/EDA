import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
import { OdooApiService } from '../../services/odoo/odoo-api.service';
import * as path from 'path';

export class OdooController {

    static async downloadInvoices(req: Request, res: Response, next: NextFunction) {
        try {
            const { url, db, username, password, dateFrom, dateTo, invoiceTypes } = req.body;

            if (!url || !db || !username || !password) {
                return next(new HttpException(400, 'Se requieren los campos: url, db, username, password'));
            }

            const folderPath = path.join(process.cwd(), 'duckdb', 'odoo');

            const result = await OdooApiService.downloadToFolder(
                { url, db, username, password, dateFrom, dateTo, invoiceTypes },
                folderPath
            );

            return res.status(200).json({
                ok: true,
                message: [
                    `${result.invoices} facturas`,
                    `${result.lines} líneas`,
                    `${result.partners} clientes`,
                    `${result.products} productos`,
                    `${result.users} vendedores`
                ].join(' · '),
                counts: result,
                files: [
                    'duckdb/odoo/facturas.csv',
                    'duckdb/odoo/facturas_lineas.csv',
                    'duckdb/odoo/clientes.csv',
                    'duckdb/odoo/productos.csv',
                    'duckdb/odoo/vendedores.csv'
                ]
            });

        } catch (err: any) {
            console.error('[Odoo] Error:', err.message);
            return next(new HttpException(500, `Error descargando datos de Odoo: ${err.message}`));
        }
    }
}
