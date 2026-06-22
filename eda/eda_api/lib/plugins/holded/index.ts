import { IEDAPlugin } from '../plugin.interface';
import { HoldedConnection } from './holded-connection';
import HoldedRouter from './holded.router';
import { HoldedSyncService } from './holded-sync.service';
import { HoldedApiService } from './holded-api.service';
import { applyHoldedLabels, resolveHoldedLocale } from './holded-labels';

const cache_config = require('../../../config/cache.config');

export const HoldedPlugin: IEDAPlugin = {
    kind: 'datasource',
    type: 'holded',
    connectionClass: HoldedConnection,
    router: HoldedRouter,
    routerPath: '/holded',
    syncService: HoldedSyncService,
    scheduleExpression: cache_config.HOLDED_SYNC_SCHEDULE,
    downloadData: (params, folderPath) => HoldedApiService.downloadToFolder(params as any, folderPath),
    applyLabels: (tables, locale) => applyHoldedLabels(tables, locale as any),
    resolveLocale: resolveHoldedLocale,
};
