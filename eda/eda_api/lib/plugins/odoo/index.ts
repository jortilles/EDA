import { IEDAPlugin } from '../plugin.interface';
import { OdooConnection } from '../../services/connection/db-systems/odoo-connection';
import OdooRouter from '../../module/odoo/odoo.router';
import { OdooSyncService } from '../../services/odoo/odoo-sync.service';

const cache_config = require('../../../config/cache.config');

export const OdooPlugin: IEDAPlugin = {
    type: 'odoo',
    connectionClass: OdooConnection,
    router: OdooRouter,
    routerPath: '/odoo',
    syncService: OdooSyncService,
    scheduleExpression: cache_config.ODOO_SYNC_SCHEDULE,
};
