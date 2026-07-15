import { FunnelConfig } from './funnel.config';
import { TreeMapConfig } from './treeMap-config';
import { MapConfig } from './map-config';
import { TableConfig } from './table-config'
import { KpiConfig } from './kpi-config';
import { DynamicTextConfig } from './dynamicText-config';
import { SankeyConfig } from './sankey-config';
import { ScatterConfig } from './scatter-config';
import { KnobConfig } from './knob-config';
import { SunburstConfig } from './sunburst-config';
import { BubblechartConfig } from './bubblechart.config';
import { TreeTableConfig } from './treeTable-config';
import { KpiTrendConfig } from './kpi-trend-config';
import { KpiDeviationConfig } from './kpi-deviation-config';

type AnyChartConfig = TableConfig | KpiConfig | DynamicTextConfig | MapConfig | SankeyConfig
    | TreeMapConfig | TreeTableConfig | ScatterConfig | KnobConfig | FunnelConfig | BubblechartConfig
    | SunburstConfig | KpiTrendConfig | KpiDeviationConfig | any;

export class ChartConfig {
  private config: AnyChartConfig;

  constructor(config: AnyChartConfig) {
     this.config = config;
  }

  getConfig(): AnyChartConfig {
    return this.config;
  }

  setConfig(config: AnyChartConfig): void {
    this.config = config;
  }
}
