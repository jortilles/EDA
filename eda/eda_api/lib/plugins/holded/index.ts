import { IEDAPlugin } from '../plugin.interface';
import { HoldedConnection } from './holded-connection';
import HoldedRouter from './holded.router';
import { HoldedSyncService } from './holded-sync.service';
import { HoldedApiService } from './holded-api.service';
import { applyHoldedLabels, resolveHoldedLocale } from './holded-labels';
import { linkTables } from '../plugin-relations';

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
    addRelations: (tables) => {
        linkTables(tables, 'invoice_lines', 'invoice_id',  'invoices', 'id');
        linkTables(tables, 'invoices',      'contact_id',  'contacts', 'id');
        linkTables(tables, 'invoice_lines', 'product_id',  'products', 'id');
        linkTables(tables, 'ledger',        'document_id', 'invoices', 'id');
    },
};
