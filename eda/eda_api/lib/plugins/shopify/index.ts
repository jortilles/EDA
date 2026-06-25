import { IEDAPlugin } from '../plugin.interface';
import { ShopifyConnection } from './shopify-connection';
import ShopifyRouter from './shopify.router';
import { ShopifySyncService } from './shopify-sync.service';

export const ShopifyPlugin: IEDAPlugin = {
    kind: 'datasource',
    type: 'shopify',
    connectionClass: ShopifyConnection,
    router: ShopifyRouter,
    routerPath: '/shopify',
    syncService: ShopifySyncService,
};
