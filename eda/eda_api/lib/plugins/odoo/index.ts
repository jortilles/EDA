import { IEDAPlugin } from '../plugin.interface';
import { OdooConnection } from './odoo-connection';
import OdooRouter from './odoo.router';
import { OdooSyncService } from './odoo-sync.service';
import { OdooApiService } from './odoo-api.service';
import { applyOdooLabels, resolveOdooLocale } from './odoo-labels';

const cache_config = require('../../../config/cache.config');

export const OdooPlugin: IEDAPlugin = {
    kind: 'datasource',
    type: 'odoo',
    connectionClass: OdooConnection,
    router: OdooRouter,
    routerPath: '/odoo',
    syncService: OdooSyncService,
    scheduleExpression: cache_config.ODOO_SYNC_SCHEDULE,
    downloadData: async (params, folderPath) => {
        await OdooApiService.downloadToFolder(params as any, folderPath);
        await OdooApiService.downloadOrdersToFolder(params as any, folderPath);
    },
    applyLabels: (tables, locale) => applyOdooLabels(tables, locale as any),
    resolveLocale: resolveOdooLocale,
};
