import { ChartJsConfig } from "./chart-js-config";

export class KpiConfig {
    sufix: string = '';
    alertLimits: any[] = [];
    edaChart: ChartJsConfig;
    constructor(init?: Partial<KpiConfig>) {
        Object.assign(this, init);
    }
}