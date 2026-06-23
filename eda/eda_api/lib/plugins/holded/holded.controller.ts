import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../module/global/model/index';
import { HoldedApiService } from './holded-api.service';
import { EnCrypterService } from '../../services/encrypter/encrypter.service';
import { DuckDBConnection } from '../../services/connection/db-systems/duckdb-connection';
import { PluginRegistry } from '../plugin-registry';
import DataSource, { IDataSource } from '../../module/datasource/model/datasource.model';
import * as path from 'path';

const cache_config = require('../../../config/cache.config');

export class HoldedController {

    static async addDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, description, folderName, apiKey, optimize, allowCache } = req.body;

            if (!name || !folderName || !apiKey) {
                return next(new HttpException(400, 'Se requieren: name, folderName, apiKey'));
            }

            const folderPath = path.join(process.cwd(), 'duckdb', folderName);

            const plugin = PluginRegistry.getDatasource('holded');
            await plugin.downloadData({ apiKey }, folderPath);

            const conn = new DuckDBConnection({ type: 'duckdb', database: folderName, schema: 'main' });
            const tables = await conn.generateDataModel(optimize ? 1 : 0, '');

            plugin.addRelations(tables);
            const locale = plugin.resolveLocale(req.body?.locale || req.headers?.['accept-language'] as string);
            plugin.applyLabels(tables, locale);

            const CC = allowCache ? cache_config.DEFAULT_CACHE_CONFIG : cache_config.DEFAULT_NO_CACHE_CONFIG;

            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: {
                        type: 'holded',
                        host: '',
                        port: null,
                        database: folderName,
                        schema: 'main',
                        user: '',
                        password: EnCrypterService.encrypt(apiKey)
                    },
                    metadata: {
                        model_name: name,
                        model_description: description || '',
                        model_id: '',
                        model_granted_roles: [],
                        optimized: !!optimize,
                        cache_config: CC,
                        model_owner: req.user._id,
                        ia_visibility: 'FULL'
                    },
                    model: { tables }
                }
            });

            const saved = await datasource.save();
            return res.status(201).json({ ok: true, data_source_id: saved._id });

        } catch (err: any) {
            console.error('[Holded] addDataSource error:', err.message);
            return next(new HttpException(500, `Error creando datasource Holded: ${err.message}`));
        }
    }

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
