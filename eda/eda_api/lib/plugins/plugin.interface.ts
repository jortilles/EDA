import { Router } from 'express';
import { AbstractConnection } from '../services/connection/abstract-connection';

export interface IEDAPlugin {
    /** Matches ds.connection.type stored in MongoDB */
    type: string;
    /** Connection class constructor */
    connectionClass: new (config: any) => AbstractConnection;
    /** Optional Express router and its mount path */
    router?: Router;
    routerPath?: string;
    /** Optional background sync service */
    syncService?: { syncAll: () => Promise<void> };
    /** node-schedule cron expression for syncService */
    scheduleExpression?: string;
}
