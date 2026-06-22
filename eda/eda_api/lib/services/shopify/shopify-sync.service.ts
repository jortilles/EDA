import * as path from 'path';
import * as fs from 'fs';
import DataSource from '../../module/datasource/model/datasource.model';
import CachedQuery from '../cache-service/cached-query.model';
import { ShopifyApiService } from './shopify-api.service';
import { SchedulerFunctions } from '../scheduler/schedulerFunctions';
import { EnCrypterService } from '../encrypter/encrypter.service';

export class ShopifySyncService {

    static readonly CONTROL_FILE = 'shopify_sync_control.csv';

    private static controlFilePath(db: string): string {
        return path.join(process.cwd(), 'duckdb', db, ShopifySyncService.CONTROL_FILE);
    }

    static readLastUpdated(db: string): string | null {
        const filePath = ShopifySyncService.controlFilePath(db);
        if (!fs.existsSync(filePath)) return null;
        const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
        const ts = lines[1]?.trim();
        return ts || null;
    }

    static writeLastUpdated(db: string, timestamp: string): void {
        const filePath = ShopifySyncService.controlFilePath(db);
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
                'ds.connection.type': 'shopify',
                'ds.metadata.cache_config.enabled': true
            }).exec();

            for (const ds of datasources) {
                await ShopifySyncService.syncOne(ds);
            }
        } catch (err: any) {
            console.error('[ShopifySync] syncAll error:', err.message);
        }
    }

    private static async syncOne(ds: any): Promise<void> {
        const conn = ds.ds.connection;
        const cacheConfig = ds.ds.metadata.cache_config;
        const db: string = conn.database;

        try {
            const lastUpdated = ShopifySyncService.readLastUpdated(db);

            if (!ShopifySyncService.shouldSync(cacheConfig, lastUpdated)) return;

            const modelName: string = ds.ds.metadata.model_name;
            console.log(`[ShopifySync] Starting sync "${modelName}" (folder: ${db})`);

            const shop        = conn.host;
            const accessToken = EnCrypterService.decode(conn.password || '');
            const folderPath  = path.join(process.cwd(), 'duckdb', db);

            await ShopifyApiService.downloadToFolder({ shop, accessToken }, folderPath);

            const timestamp = SchedulerFunctions.totLocalISOTime(new Date());
            ShopifySyncService.writeLastUpdated(db, timestamp);

            await CachedQuery.deleteMany({ 'cachedQuery.model_id': String(ds._id) });

            console.log(`[ShopifySync] Completed sync "${modelName}" at ${timestamp}`);
        } catch (err: any) {
            console.error(`[ShopifySync] Error syncing datasource ${ds._id} (${db}):`, err.message);
        }
    }
}
