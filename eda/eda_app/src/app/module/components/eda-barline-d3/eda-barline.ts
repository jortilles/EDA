import { LinkedDashboardProps } from "../eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props";

export class EdaBarlineD3 {
  id: string;
  size: { x: number, y: number; };
  chartType: string;
  edaChart: string;
  chartLabels: string[];
  categoryFieldName?: string;
  chartDataset: any[];
  chartColors: any[];
  assignedColors: any[];
  chartLegend: boolean;
  showLabels: boolean;
  showLabelsPercent: boolean;
  showGridLines: boolean;
  useGradient: boolean;
  useRoundedBars: boolean;
  /** Persistent line-vertex dots (not just on hover) - same convention as eda-line-d3. */
  showPointLines?: boolean;
  /** When true, the line series get their own value scale/axis on the right, independent of the
   * bars' scale on the left - lets a line measure on a very different magnitude from the bars
   * (e.g. a percentage line over a revenue-count bar) read at its own natural scale instead of
   * being flattened by sharing the bars' domain. Off by default (single shared axis). */
  secondAxis?: boolean;
  linkedDashboard: LinkedDashboardProps;
  /** KPI mini-chart mode (kpitrend): no axes, no grid, no legend, shorter entrance. */
  compact?: boolean;
}
