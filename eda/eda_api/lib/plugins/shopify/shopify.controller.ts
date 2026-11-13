import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../module/global/model/index';
import { ShopifyApiService } from './shopify-api.service';
import { EnCrypterService } from '../../services/encrypter/encrypter.service';
import { DuckDBConnection } from '../../services/connection/db-systems/duckdb-connection';
import { PluginRegistry } from '../plugin-registry';
import DataSource, { IDataSource } from '../../module/datasource/model/datasource.model';
import * as path from 'path';
import * as crypto from 'crypto';
import { DUCKDB_FOLDER_EXISTS_STATUS, duckdbBaseFolder, duckdbFolderExists, sanitizeDuckdbFolderName } from '../../utils/duckdb-folder.util';
import OAuthPendingState from '../../services/oauth-pending-state/oauth-pending-state.model';

const cache_config = require('../../../config/cache.config');

export class ShopifyController {

    // ── Datasource creation ───────────────────────────────────────────────────

    static async addDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, description, shop, accessToken, folderName, optimize, allowCache } = req.body;

            if (!name || !shop || !accessToken || !folderName) {
                return next(new HttpException(400, 'Se requieren: name, shop, accessToken, folderName'));
            }

            const safeFolderName = sanitizeDuckdbFolderName(folderName);
            if (duckdbFolderExists(safeFolderName)) {
                return next(new HttpException(DUCKDB_FOLDER_EXISTS_STATUS,
                    `Ya existe un modelo de datos para la carpeta "${safeFolderName}". Elija otro nombre de carpeta.`));
            }
            const folderPath = path.join(duckdbBaseFolder(), safeFolderName);

            const plugin = PluginRegistry.getDatasource('shopify');
            await plugin.downloadData({ shop, accessToken }, folderPath);

            const conn = new DuckDBConnection({ type: 'duckdb', database: safeFolderName, schema: 'main' });
            const tables = await conn.generateDataModel(optimize ? 1 : 0, '');

            plugin.addRelations(tables);
            const locale = plugin.resolveLocale(req.body?.locale || req.headers?.['accept-language'] as string);
            plugin.applyLabels(tables, locale);

            const CC = allowCache ? cache_config.DEFAULT_CACHE_CONFIG : cache_config.DEFAULT_NO_CACHE_CONFIG;

            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: {
                        type: 'shopify',
                        host: shop,
                        port: null,
                        database: safeFolderName,
                        schema: 'main',
                        user: null,
                        password: EnCrypterService.encrypt(accessToken),
                    },
                    metadata: {
                        model_name: name,
                        model_description: description || '',
                        model_id: '',
                        model_granted_roles: [],
                        optimized: !!optimize,
                        cache_config: CC,
                        model_owner: req.user._id,
                        ia_visibility: 'FULL',
                    },
                    model: { tables }
                }
            });

            const saved = await datasource.save();
            return res.status(201).json({ ok: true, data_source_id: saved._id });

        } catch (err: any) {
            console.error('[Shopify] addDataSource error:', err.message);
            return next(new HttpException(500, `Error creando datasource Shopify: ${err.message}`));
        }
    }

    // ── OAuth2 flow ───────────────────────────────────────────────────────────

    static async getAuthUrl(req: Request, res: Response, next: NextFunction) {
        try {
            const { shop, clientId, clientSecret } = (req as any).qs as Record<string, string>;
            if (!shop)         return next(new HttpException(400, 'Parámetro shop requerido'));
            if (!clientId)     return next(new HttpException(400, 'Parámetro clientId requerido'));
            if (!clientSecret) return next(new HttpException(400, 'Parámetro clientSecret requerido'));

            const state = crypto.randomBytes(16).toString('hex');
            const authUrl = ShopifyApiService.buildAuthUrl(shop, clientId, state);

            await OAuthPendingState.create({ state, data: { shop, clientId, clientSecret }, token: '' });

            return res.json({ ok: true, authUrl, state });
        } catch (err: any) {
            return next(new HttpException(500, err.message));
        }
    }

    static async handleOAuthCallback(req: Request, res: Response, next: NextFunction) {
        try {
            const { code, state, error } = (req as any).qs as Record<string, string>;

            if (error) {
                return res.send(`<script>window.close();</script>
                    <p>Autorización denegada: ${error}. Puedes cerrar esta ventana.</p>`);
            }

            if (!code || !state) {
                return next(new HttpException(400, 'Parámetros code y state requeridos'));
            }

            const pending = await OAuthPendingState.findOne({ state }).exec();
            if (!pending) {
                return res.send(`<script>window.close();</script>
                    <p>Estado OAuth inválido o expirado. Cierra esta ventana e inténtalo de nuevo.</p>`);
            }

            const { shop, clientId, clientSecret } = pending.data;
            const accessToken = await ShopifyApiService.exchangeCodeForToken(shop, clientId, clientSecret, code);

            pending.token = accessToken;
            await pending.save();

            return res.send(`<!DOCTYPE html><html><body>
                <p style="font-family:sans-serif;text-align:center;margin-top:40px">
                    ✅ Autorización correcta. Puedes cerrar esta ventana.</p>
                <script>
                    if (window.opener) { window.opener.postMessage('shopify-auth-ok', '*'); }
                    setTimeout(() => window.close(), 1500);
                </script>
                </body></html>`);
        } catch (err: any) {
            console.error('[Shopify OAuth] callback error:', err.message);
            return res.send(`<script>window.close();</script><p>Error: ${err.message}</p>`);
        }
    }

    static async pollToken(req: Request, res: Response, next: NextFunction) {
        const { state } = (req as any).qs as { state: string };
        if (!state) return next(new HttpException(400, 'state requerido'));

        const entry = await OAuthPendingState.findOne({ state }).exec();
        if (!entry || !entry.token) {
            return res.json({ ok: true, ready: false });
        }

        const { shop } = entry.data;
        const accessToken = entry.token;
        await OAuthPendingState.deleteOne({ _id: entry._id }).exec(); // consume once
        return res.json({ ok: true, ready: true, accessToken, shop });
    }

    // ── Manual download ───────────────────────────────────────────────────────

    static async downloadData(req: Request, res: Response, next: NextFunction) {
        try {
            const { shop, accessToken, folderName, dateFrom, dateTo } = req.body;

            if (!shop || !accessToken || !folderName) {
                return next(new HttpException(400, 'Se requieren los campos: shop, accessToken, folderName'));
            }

            const folderPath = path.join(process.cwd(), 'duckdb', folderName);
            const result = await ShopifyApiService.downloadToFolder(
                { shop, accessToken, dateFrom, dateTo },
                folderPath
            );

            return res.status(200).json({
                ok: true,
                message: [
                    `${result.orders} pedidos`,
                    `${result.orderLines} líneas`,
                    `${result.customers} clientes`,
                    `${result.products} productos`,
                    `${result.variants} variantes`
                ].join(' · '),
                counts: result,
            });

        } catch (err: any) {
            console.error('[Shopify] Error:', err.message);
            return next(new HttpException(500, `Error descargando datos de Shopify: ${err.message}`));
        }
    }
}
