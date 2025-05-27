import { ChartJsConfig } from "./chart-js-config";

export class KpiConfig {
    sufix: string = '';
    alertLimits: any[] = [];
    edaChart: ChartJsConfig;
    constructor(init?: Partial<KpiConfig>) {
        this.edaChart = new ChartJsConfig(
          init?.edaChart?.colors || [],
          init?.edaChart?.chartType || "",
          init?.edaChart?.addTrend || false,
          init?.edaChart?.addComparative || false,
          init?.edaChart?.showLabels || false,
          init?.edaChart?.showLabelsPercent || false,
          init?.edaChart?.numberOfColumns || 0,
          init?.edaChart?.assignedColors || []
        );
        
        Object.assign(this, init);


    }
}