import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../module/global/model/index';
import { GA4ApiService } from './ga4-api.service';
import { EnCrypterService } from '../../services/encrypter/encrypter.service';
import { DuckDBConnection } from '../../services/connection/db-systems/duckdb-connection';
import { PluginRegistry } from '../plugin-registry';
import DataSource, { IDataSource } from '../../module/datasource/model/datasource.model';
import * as path from 'path';
import * as crypto from 'crypto';

const cache_config = require('../../../config/cache.config');

// In-memory store for pending OAuth states (state → refresh_token).
// Entries are cleaned up after retrieval or after 10 minutes.
const pendingTokens = new Map<string, { token: string; expiresAt: number }>();

const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];
const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Periodically clean expired entries
setInterval(() => {
    const now = Date.now();
    for (const [state, entry] of pendingTokens.entries()) {
        if (entry.expiresAt < now) pendingTokens.delete(state);
    }
}, 60_000);

export class GoogleAnalyticsController {

    static async addDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, description, propertyId, credentialsJson, folderName, optimize, allowCache } = req.body;

            if (!name || !propertyId || !credentialsJson || !folderName) {
                return next(new HttpException(400, 'Se requieren: name, propertyId, credentialsJson, folderName'));
            }

            const safeFolderName = folderName.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
            const folderPath = path.join(process.cwd(), 'duckdb', safeFolderName);

            const plugin = PluginRegistry.getDatasource('googleanalytics');
            await plugin.downloadData({ propertyId, credentialsJson }, folderPath);

            const conn = new DuckDBConnection({ type: 'duckdb', database: safeFolderName, schema: 'main' });
            const tables = await conn.generateDataModel(optimize ? 1 : 0, '');

            plugin.addRelations(tables);
            const locale = plugin.resolveLocale(req.body?.locale || req.headers?.['accept-language'] as string);
            plugin.applyLabels(tables, locale);

            const CC = allowCache ? cache_config.DEFAULT_CACHE_CONFIG : cache_config.DEFAULT_NO_CACHE_CONFIG;

            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: {
                        type: 'googleanalytics',
                        host: propertyId,
                        port: null,
                        database: safeFolderName,
                        schema: 'main',
                        user: null,
                        password: EnCrypterService.encrypt(credentialsJson)
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
            console.error('[GA4] addDataSource error:', err.message);
            return next(new HttpException(500, `Error creando datasource Google Analytics: ${err.message}`));
        }
    }

    // ── OAuth2 flow ───────────────────────────────────────────────────────────

    static getAuthUrl(req: Request, res: Response, next: NextFunction) {
        try {
            if (!GA4ApiService.isOAuthConfigured()) {
                return next(new HttpException(503, 'GA4_CLIENT_ID y GA4_CLIENT_SECRET no están configurados en el servidor'));
            }

            const token = crypto.randomBytes(16).toString('hex');
            const instanceCallback = process.env.GA4_REDIRECT_URI;
            if (!instanceCallback) {
                return next(new HttpException(503, 'GA4_REDIRECT_URI no está configurado en el servidor'));
            }
            const state = `${token}|${instanceCallback}`;

            const oauth2Client = GA4ApiService.buildOAuth2Client();

            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                prompt: 'consent',   // force refresh_token on every consent
                scope: SCOPES,
                state
            });

            // Frontend polls using only the token (proxy strips |instanceName)
            return res.json({ ok: true, authUrl, state: token });
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

            const oauth2Client = GA4ApiService.buildOAuth2Client();
            const { tokens } = await oauth2Client.getToken(code);

            if (!tokens.refresh_token) {
                return res.send(`<script>window.close();</script>
                    <p>No se recibió refresh_token. Asegúrate de que el acceso es de tipo "offline".
                    Revoca el acceso en <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a>
                    y vuelve a intentarlo.</p>`);
            }

            pendingTokens.set(state, {
                token: JSON.stringify({ type: 'oauth2', refresh_token: tokens.refresh_token }),
                expiresAt: Date.now() + TOKEN_TTL_MS
            });

            // Close the popup — the main window is polling poll-token
            return res.send(`<!DOCTYPE html><html><body>
                <p style="font-family:sans-serif;text-align:center;margin-top:40px">
                    ✅ Autorización correcta. Puedes cerrar esta ventana.</p>
                <script>
                    if (window.opener) { window.opener.postMessage('ga4-auth-ok', '*'); }
                    setTimeout(() => window.close(), 1500);
                </script>
                </body></html>`);
        } catch (err: any) {
            console.error('[GA4 OAuth] callback error:', err.message);
            return res.send(`<script>window.close();</script><p>Error: ${err.message}</p>`);
        }
    }

    static pollToken(req: Request, res: Response, next: NextFunction) {
        const { state } = (req as any).qs as { state: string };
        if (!state) return next(new HttpException(400, 'state requerido'));

        const entry = pendingTokens.get(state);
        if (!entry || entry.expiresAt < Date.now()) {
            return res.json({ ok: true, ready: false });
        }

        pendingTokens.delete(state); // consume once
        return res.json({ ok: true, ready: true, credentialsJson: entry.token });
    }

    // ── Manual download (for direct API calls) ────────────────────────────────

    static async downloadReport(req: Request, res: Response, next: NextFunction) {
        try {
            const { propertyId, credentialsJson, dateFrom, dateTo, folderName } = req.body;

            if (!propertyId || !credentialsJson || !folderName) {
                return next(new HttpException(400, 'Se requieren los campos: propertyId, credentialsJson, folderName'));
            }

            const folderPath = path.join(process.cwd(), 'duckdb', folderName);

            const result = await GA4ApiService.downloadToFolder(
                { propertyId, credentialsJson, dateFrom, dateTo },
                folderPath
            );

            return res.status(200).json({
                ok: true,
                message: [
                    `${result.sessions} filas en sesiones`,
                    `${result.pages} filas en páginas`,
                    `${result.events} filas en eventos`,
                    `${result.devices} filas en dispositivos`,
                    `${result.geographic} filas en geográfico`
                ].join(' · '),
                counts: result,
                files: [
                    `duckdb/${folderName}/sesiones.csv`,
                    `duckdb/${folderName}/paginas.csv`,
                    `duckdb/${folderName}/eventos.csv`,
                    `duckdb/${folderName}/dispositivos.csv`,
                    `duckdb/${folderName}/geografico.csv`
                ]
            });

        } catch (err: any) {
            console.error('[GA4] Error:', err.message);
            return next(new HttpException(500, `Error descargando datos de Google Analytics: ${err.message}`));
        }
    }
}
