import { IEDAPlugin } from '../plugin.interface';
import { GoogleAnalyticsConnection } from './google-analytics-connection';
import GoogleAnalyticsRouter from './google-analytics.router';
import { GA4SyncService } from './ga4-sync.service';
import { GA4ApiService } from './ga4-api.service';
import { applyGA4Labels, resolveGA4Locale } from './ga4-labels';

const cache_config = require('../../../config/cache.config');

export const GoogleAnalyticsPlugin: IEDAPlugin = {
    kind: 'datasource',
    type: 'googleanalytics',
    connectionClass: GoogleAnalyticsConnection,
    router: GoogleAnalyticsRouter,
    routerPath: '/google-analytics',
    syncService: GA4SyncService,
    scheduleExpression: cache_config.GA4_SYNC_SCHEDULE,
    downloadData: (params, folderPath) => GA4ApiService.downloadToFolder(params as any, folderPath),
    applyLabels: (tables, locale) => applyGA4Labels(tables, locale as any),
    resolveLocale: resolveGA4Locale,
};
