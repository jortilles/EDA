export interface IEDAPlugin {
    type: string;
    connectionClass: any;
    router?: any;
    routerPath?: string;
    syncService?: { syncAll(): Promise<void> };
    scheduleExpression?: string;
}
