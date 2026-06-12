import { IEDAPlugin } from '../plugin.interface';
import { GoogleAnalyticsConnection } from '../../services/connection/db-systems/google-analytics-connection';
import GoogleAnalyticsRouter from '../../module/google-analytics/google-analytics.router';
import { GA4SyncService } from '../../services/google-analytics/ga4-sync.service';

const cache_config = require('../../../config/cache.config');

export const GoogleAnalyticsPlugin: IEDAPlugin = {
    type: 'googleanalytics',
    connectionClass: GoogleAnalyticsConnection,
    router: GoogleAnalyticsRouter,
    routerPath: '/google-analytics',
    syncService: GA4SyncService,
    scheduleExpression: cache_config.GA4_SYNC_SCHEDULE,
};
