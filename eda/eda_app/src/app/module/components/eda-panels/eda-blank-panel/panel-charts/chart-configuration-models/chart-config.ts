import { ChartJsConfig } from './chart-js-config'
import { TableConfig } from './table-config'
import { KpiConfig } from './kpi-config';

export class ChartConfig {
  private config: ChartJsConfig | TableConfig | KpiConfig

  constructor(config: ChartJsConfig | TableConfig | KpiConfig) {
    this.config = config;
  }
  
  getConfig(): ChartJsConfig | TableConfig | KpiConfig {
    return this.config;
  }
  setConfig(config: ChartJsConfig | TableConfig | KpiConfig):void{
    this.config = config;
  }
}
