import * as path from 'path';
import * as fs from 'fs';
import DataSource from '../../module/datasource/model/datasource.model';
import CachedQuery from '../cache-service/cached-query.model';
import { OdooApiService } from './odoo-api.service';
import { SchedulerFunctions } from '../scheduler/schedulerFunctions';
import { EnCrypterService } from '../encrypter/encrypter.service';

export class OdooSyncService {

    static readonly CONTROL_FILE = 'odoo_sync_control.csv';

    // ── Control file helpers ──────────────────────────────────────────────────

    private static controlFilePath(db: string): string {
        return path.join(process.cwd(), 'duckdb', db, OdooSyncService.CONTROL_FILE);
    }

    static readLastUpdated(db: string): string | null {
        const filePath = OdooSyncService.controlFilePath(db);
        if (!fs.existsSync(filePath)) return null;
        const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
        // line 0 = header 'last_updated', line 1 = ISO timestamp
        const ts = lines[1]?.trim();
        return ts || null;
    }

    static writeLastUpdated(db: string, timestamp: string): void {
        const filePath = OdooSyncService.controlFilePath(db);
        fs.writeFileSync(filePath, `last_updated\n${timestamp}`, 'utf8');
    }

    // ── Schedule check ────────────────────────────────────────────────────────

    static shouldSync(cacheConfig: any, lastUpdated: string | null): boolean {
        if (!cacheConfig?.enabled) return false;
        if (!lastUpdated) return true; // never synced → do it immediately

        const { units, quantity, hours, minutes } = cacheConfig;

        if (units === 'hours') {
            return SchedulerFunctions.checkScheduleHours(Number(quantity), lastUpdated);
        }
        if (units === 'days') {
            return SchedulerFunctions.checkScheduleDays(Number(quantity), hours, minutes, lastUpdated);
        }
        return false;
    }

    // ── Public entry point called by the scheduler ────────────────────────────

    static async syncAll(): Promise<void> {
        try {
            const datasources = await DataSource.find({
                'ds.connection.type': 'odoo',
                'ds.metadata.cache_config.enabled': true
            }).exec();

            for (const ds of datasources) {
                await OdooSyncService.syncOne(ds);
            }
        } catch (err: any) {
            console.error('[OdooSync] syncAll error:', err.message);
        }
    }

    // ── Single datasource sync ────────────────────────────────────────────────

    private static async syncOne(ds: any): Promise<void> {
        const conn = ds.ds.connection;
        const cacheConfig = ds.ds.metadata.cache_config;
        const db: string = conn.database;

        try {
            const lastUpdated = OdooSyncService.readLastUpdated(db);

            if (!OdooSyncService.shouldSync(cacheConfig, lastUpdated)) return;

            const modelName: string = ds.ds.metadata.model_name;
            console.log(`[OdooSync] Starting sync "${modelName}" (db: ${db})`);

            const password = EnCrypterService.decode(conn.password || '');
            const folderPath = path.join(process.cwd(), 'duckdb', db);

            await OdooApiService.downloadToFolder(
                {
                    url: (conn.host || '').replace(/\/$/, ''),
                    db,
                    username: conn.user,
                    password
                },
                folderPath
            );

            // Write control file with the current timestamp
            const timestamp = SchedulerFunctions.totLocalISOTime(new Date());
            OdooSyncService.writeLastUpdated(db, timestamp);

            // Invalidate cached queries so they re-execute against the fresh CSV data
            await CachedQuery.deleteMany({ 'cachedQuery.model_id': String(ds._id) });

            console.log(`[OdooSync] Completed sync "${modelName}" at ${timestamp}`);
        } catch (err: any) {
            console.error(`[OdooSync] Error syncing datasource ${ds._id} (${db}):`, err.message);
        }
    }
}
