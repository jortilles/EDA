import { FunnelConfig } from './funnel.config';
import { TreeMapConfig } from './treeMap-config';
import { MapConfig } from './map-config';
import { ChartJsConfig } from './chart-js-config'
import { TableConfig } from './table-config'
import { KpiConfig } from './kpi-config';
import { SankeyConfig } from './sankey-config';
import { ScatterConfig } from './scatter-config';
import { KnobConfig } from './knob-config';


export class ChartConfig {
  private config: ChartJsConfig | TableConfig | KpiConfig | MapConfig | SankeyConfig | TreeMapConfig | ScatterConfig | KnobConfig | FunnelConfig

  constructor(config: ChartJsConfig | TableConfig | KpiConfig | MapConfig | SankeyConfig | TreeMapConfig | ScatterConfig | KnobConfig | FunnelConfig) {
     this.config = config;
  }
  
  getConfig(): ChartJsConfig | TableConfig | KpiConfig | MapConfig | SankeyConfig | TreeMapConfig | ScatterConfig | KnobConfig | FunnelConfig {
    return this.config;
  }
  setConfig(config: ChartJsConfig | TableConfig | KpiConfig | MapConfig | SankeyConfig | TreeMapConfig | ScatterConfig | KnobConfig | FunnelConfig):void{
    this.config = config;
  }
}
