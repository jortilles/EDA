import { IEDAPlugin } from '../plugin.interface';
import { OdooConnection } from './odoo-connection';
import OdooRouter from './odoo.router';
import { OdooSyncService } from './odoo-sync.service';
import { OdooApiService } from './odoo-api.service';
import { applyOdooLabels, resolveOdooLocale } from './odoo-labels';
import { linkTables } from '../plugin-relations';

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
    addRelations: (tables) => {
        linkTables(tables, 'invoices', 'product_id',     'products', 'id');
        linkTables(tables, 'invoices', 'partner_id',     'partners', 'id');
        linkTables(tables, 'invoices', 'salesperson_id', 'users',    'id');
        linkTables(tables, 'orders',   'product_id',     'products', 'id');
        linkTables(tables, 'orders',   'partner_id',     'partners', 'id');
        linkTables(tables, 'orders',   'salesperson_id', 'users',    'id');
        tables.forEach((t: any) => {
            t.relations = t.relations.filter((r: any) =>
                !(r.source_table === 'invoices' && r.target_table === 'orders') &&
                !(r.source_table === 'orders'   && r.target_table === 'invoices')
            );
        });
    },
};
