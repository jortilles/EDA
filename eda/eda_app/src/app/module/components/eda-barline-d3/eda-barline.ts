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
  linkedDashboard: LinkedDashboardProps;
  /** KPI mini-chart mode (kpitrend): no axes, no grid, no legend, shorter entrance. */
  compact?: boolean;
}
