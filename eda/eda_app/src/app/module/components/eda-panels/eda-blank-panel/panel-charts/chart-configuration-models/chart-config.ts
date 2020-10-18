import { MapConfig } from './map-config';
import { ChartJsConfig } from './chart-js-config'
import { TableConfig } from './table-config'
import { KpiConfig } from './kpi-config';

export class ChartConfig {
  private config: ChartJsConfig | TableConfig | KpiConfig | MapConfig

  constructor(config: ChartJsConfig | TableConfig | KpiConfig | MapConfig) {
    this.config = config;
  }
  
  getConfig(): ChartJsConfig | TableConfig | KpiConfig | MapConfig {
    return this.config;
  }
  setConfig(config: ChartJsConfig | TableConfig | KpiConfig | MapConfig):void{
    this.config = config;
  }
}
