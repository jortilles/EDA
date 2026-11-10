import { IEDAPlugin } from '../plugin.interface';
import { ShopifyConnection } from './shopify-connection';
import ShopifyRouter from './shopify.router';
import { ShopifySyncService } from './shopify-sync.service';
import { ShopifyApiService } from './shopify-api.service';
import { applyShopifyLabels, resolveShopifyLocale } from './shopify-labels';
import { dropSyncControlTables, linkTables } from '../plugin-relations';

export const ShopifyPlugin: IEDAPlugin = {
    kind: 'datasource',
    type: 'shopify',
    connectionClass: ShopifyConnection,
    router: ShopifyRouter,
    routerPath: '/shopify',
    syncService: ShopifySyncService,
    downloadData: (params, folderPath) => ShopifyApiService.downloadToFolder(params as any, folderPath),
    applyLabels: (tables, locale) => applyShopifyLabels(tables, locale as any),
    resolveLocale: resolveShopifyLocale,
    addRelations: (tables) => {
        dropSyncControlTables(tables);
        linkTables(tables, 'order_lines', 'order_id',   'orders',   'id');
        linkTables(tables, 'order_lines', 'product_id', 'products', 'id');
        linkTables(tables, 'order_lines', 'variant_id', 'variants', 'id');
        linkTables(tables, 'orders',      'customer_id', 'customers', 'id');
        linkTables(tables, 'variants',    'product_id',  'products',  'id');
    },
};
