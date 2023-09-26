import { FunnelConfig } from './funnel.config';
import { TreeMapConfig } from './treeMap-config';
import { MapConfig } from './map-config';
import { ChartJsConfig } from './chart-js-config'
import { TableConfig } from './table-config'
import { KpiConfig } from './kpi-config';
import { DynamicTextConfig } from './dynamicText-config';
import { SankeyConfig } from './sankey-config';
import { ScatterConfig } from './scatter-config';
import { KnobConfig } from './knob-config';
import { SunburstConfig } from './sunburst-config';
import { BubblechartConfig } from './bubblechart.config';



export class ChartConfig {
  private config: ChartJsConfig | TableConfig | KpiConfig | DynamicTextConfig| MapConfig | SankeyConfig | TreeMapConfig | ScatterConfig | KnobConfig | FunnelConfig | BubblechartConfig |SunburstConfig

  constructor(config: ChartJsConfig | TableConfig | KpiConfig | DynamicTextConfig | MapConfig | SankeyConfig | TreeMapConfig | ScatterConfig | KnobConfig | FunnelConfig | BubblechartConfig  | SunburstConfig) {
     this.config = config;
  }
  
  getConfig(): ChartJsConfig | TableConfig | KpiConfig | DynamicTextConfig | MapConfig | SankeyConfig | TreeMapConfig | ScatterConfig | KnobConfig | FunnelConfig | BubblechartConfig  | SunburstConfig{
    return this.config;
  }
  setConfig(config: ChartJsConfig | TableConfig | KpiConfig | DynamicTextConfig | MapConfig | SankeyConfig | TreeMapConfig | ScatterConfig | KnobConfig | FunnelConfig | BubblechartConfig | SunburstConfig):void{
    this.config = config;
  }
}
