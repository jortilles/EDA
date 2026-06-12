import { IEDAPlugin } from '../plugin.interface';
import { HoldedConnection } from '../../services/connection/db-systems/holded-connection';
import HoldedRouter from '../../module/holded/holded.router';
import { HoldedSyncService } from '../../services/holded/holded-sync.service';

const cache_config = require('../../../config/cache.config');

export const HoldedPlugin: IEDAPlugin = {
    type: 'holded',
    connectionClass: HoldedConnection,
    router: HoldedRouter,
    routerPath: '/holded',
    syncService: HoldedSyncService,
    scheduleExpression: cache_config.HOLDED_SYNC_SCHEDULE,
};
