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
import { RaceBarConfig } from './race-bar-config';

type AnyChartConfig = TableConfig | KpiConfig | DynamicTextConfig | MapConfig | SankeyConfig
    | TreeMapConfig | TreeTableConfig | ScatterConfig | KnobConfig | FunnelConfig | BubblechartConfig
    | SunburstConfig | KpiTrendConfig | KpiDeviationConfig | RaceBarConfig | any;

export class ChartConfig {
  // Set once at bootstrap (see main.ts) when the app is loaded headlessly to render a
  // dashboard PDF for email sending. Forces every chart's entrance animation off so the
  // export screenshot doesn't get taken mid-transition, leaving panels blank/partial.
  static disableAnimations = false;

  private config: AnyChartConfig;

  constructor(config: AnyChartConfig) {
     this.config = config;
  }

  getConfig(): AnyChartConfig {
    if (ChartConfig.disableAnimations && this.config) {
      const config: any = { ...this.config, chartAnimation: false };
      if (config.edaChart) {
        config.edaChart = { ...config.edaChart, chartAnimation: false };
      }
      return config;
    }
    return this.config;
  }

  setConfig(config: AnyChartConfig): void {
    this.config = config;
  }
}
