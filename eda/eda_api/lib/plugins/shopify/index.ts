import { IEDAPlugin } from '../plugin.interface';
import { ShopifyConnection } from '../../services/connection/db-systems/shopify-connection';
import ShopifyRouter from '../../module/shopify/shopify.router';
import { ShopifySyncService } from '../../services/shopify/shopify-sync.service';

export const ShopifyPlugin: IEDAPlugin = {
    kind: 'datasource',
    type: 'shopify',
    connectionClass: ShopifyConnection,
    router: ShopifyRouter,
    routerPath: '/shopify',
    syncService: ShopifySyncService,
};
