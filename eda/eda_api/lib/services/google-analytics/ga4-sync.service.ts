import * as path from 'path';
import * as fs from 'fs';
import DataSource from '../../module/datasource/model/datasource.model';
import CachedQuery from '../cache-service/cached-query.model';
import { GA4ApiService } from './ga4-api.service';
import { SchedulerFunctions } from '../scheduler/schedulerFunctions';
import { EnCrypterService } from '../encrypter/encrypter.service';

export class GA4SyncService {

    static readonly CONTROL_FILE = 'ga4_sync_control.csv';

    private static controlFilePath(db: string): string {
        return path.join(process.cwd(), 'duckdb', db, GA4SyncService.CONTROL_FILE);
    }

    static readLastUpdated(db: string): string | null {
        const filePath = GA4SyncService.controlFilePath(db);
        if (!fs.existsSync(filePath)) return null;
        const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
        const ts = lines[1]?.trim();
        return ts || null;
    }

    static writeLastUpdated(db: string, timestamp: string): void {
        const filePath = GA4SyncService.controlFilePath(db);
        fs.writeFileSync(filePath, `last_updated\n${timestamp}`, 'utf8');
    }

    static shouldSync(cacheConfig: any, lastUpdated: string | null): boolean {
        if (!cacheConfig?.enabled) return false;
        if (!lastUpdated) return true;

        const { units, quantity, hours, minutes } = cacheConfig;
        if (units === 'hours') {
            return SchedulerFunctions.checkScheduleHours(Number(quantity), lastUpdated);
        }
        if (units === 'days') {
            return SchedulerFunctions.checkScheduleDays(Number(quantity), hours, minutes, lastUpdated);
        }
        return false;
    }

    static async syncAll(): Promise<void> {
        try {
            const datasources = await DataSource.find({
                'ds.connection.type': 'googleanalytics',
                'ds.metadata.cache_config.enabled': true
            }).exec();

            for (const ds of datasources) {
                await GA4SyncService.syncOne(ds);
            }
        } catch (err: any) {
            console.error('[GA4Sync] syncAll error:', err.message);
        }
    }

    private static async syncOne(ds: any): Promise<void> {
        const conn = ds.ds.connection;
        const cacheConfig = ds.ds.metadata.cache_config;
        const db: string = conn.database;

        try {
            const lastUpdated = GA4SyncService.readLastUpdated(db);
            if (!GA4SyncService.shouldSync(cacheConfig, lastUpdated)) return;

            const modelName: string = ds.ds.metadata.model_name;
            console.log(`[GA4Sync] Starting sync "${modelName}" (db: ${db})`);

            const credentialsJson = EnCrypterService.decode(conn.password || '');
            const folderPath = path.join(process.cwd(), 'duckdb', db);

            await GA4ApiService.downloadToFolder(
                {
                    propertyId: conn.host,
                    credentialsJson
                },
                folderPath
            );

            const timestamp = SchedulerFunctions.totLocalISOTime(new Date());
            GA4SyncService.writeLastUpdated(db, timestamp);

            await CachedQuery.deleteMany({ 'cachedQuery.model_id': String(ds._id) });

            console.log(`[GA4Sync] Completed sync "${modelName}" at ${timestamp}`);
        } catch (err: any) {
            console.error(`[GA4Sync] Error syncing datasource ${ds._id} (${db}):`, err.message);
        }
    }
}
