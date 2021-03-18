import { TreeMapConfig } from './treeMap-config';
import { MapConfig } from './map-config';
import { ChartJsConfig } from './chart-js-config'
import { TableConfig } from './table-config'
import { KpiConfig } from './kpi-config';
import { SankeyConfig } from './sankey-config';
import { ScatterConfig } from './scatter-config';
import { KnobConfig } from './knob-config';

export class ChartConfig {
  private config: ChartJsConfig | TableConfig | KpiConfig | MapConfig | SankeyConfig | TreeMapConfig | ScatterConfig | KnobConfig

  constructor(config: ChartJsConfig | TableConfig | KpiConfig | MapConfig | SankeyConfig | TreeMapConfig | ScatterConfig | KnobConfig) {
    this.config = config;
  }
  
  getConfig(): ChartJsConfig | TableConfig | KpiConfig | MapConfig | SankeyConfig | TreeMapConfig | ScatterConfig | KnobConfig {
    return this.config;
  }
  setConfig(config: ChartJsConfig | TableConfig | KpiConfig | MapConfig | SankeyConfig | TreeMapConfig | ScatterConfig | KnobConfig):void{
    this.config = config;
  }
}
