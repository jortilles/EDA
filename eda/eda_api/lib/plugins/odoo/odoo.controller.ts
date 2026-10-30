import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../module/global/model/index';
import { OdooApiService } from './odoo-api.service';
import { EnCrypterService } from '../../services/encrypter/encrypter.service';
import { DuckDBConnection } from '../../services/connection/db-systems/duckdb-connection';
import { PluginRegistry } from '../plugin-registry';
import { resolvePluginModelLocale } from '../plugin-locale';
import DataSource, { IDataSource } from '../../module/datasource/model/datasource.model';
import { ownerOnlyGrantedRoles } from '../../utils/model-owner-security.util';
import * as path from 'path';
import { DUCKDB_FOLDER_EXISTS_STATUS, duckdbBaseFolder, duckdbFolderExists } from '../../utils/duckdb-folder.util';

const cache_config = require('../../../config/cache.config');

export class OdooController {

    static async addDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, description, url, db, username, password, optimize, allowCache } = req.body;

            if (!name || !url || !db || !username || !password) {
                return next(new HttpException(400, 'Se requieren: name, url, db, username, password'));
            }

            // The Odoo database name is also the folder name under duckdb/ (connection.database
            // is used both to authenticate and to locate the CSV files), so it can't be renamed
            if (db !== path.basename(db) || db.includes('..')) {
                return next(new HttpException(400, `Nombre de base de datos no válido: "${db}"`));
            }
            if (duckdbFolderExists(db)) {
                return next(new HttpException(DUCKDB_FOLDER_EXISTS_STATUS,
                    `Ya existe un modelo de datos para la base de datos de Odoo "${db}" (la carpeta "${db}" ya existe).`));
            }
            const folderPath = path.join(duckdbBaseFolder(), db);

            const plugin = PluginRegistry.getDatasource('odoo');
            await plugin.downloadData({ url, db, username, password }, folderPath);

            const conn = new DuckDBConnection({ type: 'duckdb', database: db, schema: 'main' });
            const tables = await conn.generateDataModel(optimize ? 1 : 0, '');

            plugin.addRelations(tables);
            const locale = resolvePluginModelLocale(plugin, req);
            plugin.applyLabels(tables, locale);

            const CC = allowCache ? cache_config.DEFAULT_CACHE_CONFIG : cache_config.DEFAULT_NO_CACHE_CONFIG;

            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: {
                        type: 'odoo',
                        host: url,
                        port: null,
                        database: db,
                        schema: 'main',
                        user: username,
                        password: EnCrypterService.encrypt(password)
                    },
                    metadata: {
                        model_name: name,
                        model_description: description || '',
                        model_id: '',
                        /*Edalitics Free */ model_granted_roles: ownerOnlyGrantedRoles(req.user),
                        optimized: !!optimize,
                        cache_config: CC,
                        model_owner: req.user._id,
                        ia_visibility: 'FULL',
                        // Locale the labels were generated in, reused when the model is refreshed
                        locale
                    },
                    model: { tables }
                }
            });

            const saved = await datasource.save();
            return res.status(201).json({ ok: true, data_source_id: saved._id });

        } catch (err: any) {
            console.error('[Odoo] addDataSource error:', err.message);
            return next(new HttpException(500, `Error creando datasource Odoo: ${err.message}`));
        }
    }

    static async download(req: Request, res: Response, next: NextFunction) {
        try {
            const { url, db, username, password, dateFrom, dateTo, invoiceTypes } = req.body;

            if (!url || !db || !username || !password) {
                return next(new HttpException(400, 'Se requieren los campos: url, db, username, password'));
            }

            const folderPath = path.join(process.cwd(), 'duckdb', db);

            // 1. Invoices, partners, products, users
            const invoiceResult = await OdooApiService.downloadToFolder(
                { url, db, username, password, dateFrom, dateTo, invoiceTypes },
                folderPath
            );

            // 2. Orders
            const orderResult = await OdooApiService.downloadOrdersToFolder(
                { url, db, username, password, dateFrom, dateTo },
                folderPath
            );

            return res.status(200).json({
                ok: true,
                message: [
                    `${invoiceResult.invoices} invoices`,
                    `${orderResult.orders} orders`,
                    `${invoiceResult.partners} partners`,
                    `${invoiceResult.products} products`,
                    `${invoiceResult.users} users`
                ].join(' · '),
                counts: { ...invoiceResult, orders: orderResult.orders },
                files: [
                    `duckdb/${db}/invoices.csv`,
                    `duckdb/${db}/orders.csv`,
                    `duckdb/${db}/partners.csv`,
                    `duckdb/${db}/products.csv`,
                    `duckdb/${db}/users.csv`
                ]
            });

        } catch (err: any) {
            console.error('[Odoo] Error:', err.message);
            return next(new HttpException(500, `Error descargando datos de Odoo: ${err.message}`));
        }
    }
}
