import { Router } from 'express';
import { AbstractConnection } from '../services/connection/abstract-connection';

interface IBasePlugin {
    kind: 'datasource' | 'feature' | 'auth';
    type: string;
    router?: Router;
    routerPath?: string;
    syncService?: { syncAll: () => Promise<void> };
    scheduleExpression?: string;
}

/*************** Interfaces Start ***************/

/** Plugin that provides a database connection (datasources: MySQL, PostgreSQL, GA4, Odoo...) */
export interface IDatasourcePlugin extends IBasePlugin {
    kind: 'datasource';
    connectionClass: new (config: any) => AbstractConnection;
    /** Download fresh data from the external source into folderPath */
    downloadData?: (params: Record<string, any>, folderPath: string) => Promise<any>;
    /** Apply localized display names to the generated data model tables */
    applyLabels?: (tables: any[], locale: string) => void;
    /** Resolve a raw locale string (e.g. "es-ES", "en") to the plugin's supported locale */
    resolveLocale?: (raw?: string) => string;
    /** Add domain-specific relations between generated data model tables */
    addRelations?: (tables: any[]) => void;
}

/** Plugin that adds a feature module (new routes, pages, actions...) without a database connection */
export interface IFeaturePlugin extends IBasePlugin {
    kind: 'feature';
    router: Router;
    routerPath: string;
}

/** Plugin that provides an alternate/legacy password verification strategy for login, gated by its own isEnabled() check */
export interface IAuthPlugin extends IBasePlugin {
    kind: 'auth';
    isEnabled: () => boolean;
    verifyLegacyPassword: (password: string, storedHash: string) => Promise<boolean>;
}

/*************** Interfaces End ***************/

export type IEDAPlugin = IDatasourcePlugin | IFeaturePlugin | IAuthPlugin;

export function isDatasourcePlugin(plugin: IEDAPlugin): plugin is IDatasourcePlugin {
    return plugin.kind === 'datasource';
}

export function isAuthPlugin(plugin: IEDAPlugin): plugin is IAuthPlugin {
    return plugin.kind === 'auth';
}
