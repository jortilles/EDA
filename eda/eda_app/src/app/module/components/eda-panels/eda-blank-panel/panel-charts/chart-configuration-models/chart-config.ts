import { MapConfig } from './map-config';
import { ChartJsConfig } from './chart-js-config'
import { TableConfig } from './table-config'
import { KpiConfig } from './kpi-config';
import { SankeyConfig } from './sankey-config';

export class ChartConfig {
  private config: ChartJsConfig | TableConfig | KpiConfig | MapConfig | SankeyConfig

  constructor(config: ChartJsConfig | TableConfig | KpiConfig | MapConfig | SankeyConfig) {
    this.config = config;
  }
  
  getConfig(): ChartJsConfig | TableConfig | KpiConfig | MapConfig | SankeyConfig {
    return this.config;
  }
  setConfig(config: ChartJsConfig | TableConfig | KpiConfig | MapConfig | SankeyConfig):void{
    this.config = config;
  }
}
