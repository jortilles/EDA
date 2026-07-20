import { LinkedDashboardProps } from "../eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props";

export class EdaBarD3 {
  id: string;
  size: { x: number, y: number; };
  chartType: string;
  edaChart: string;
  chartLabels: string[];
  categoryFieldName?: string;
  chartDataset: any[];
  chartColors: any[];
  assignedColors: any[];
  /** Per-category color override (colored-bars-by-threshold / unique-per-bar modes), keyed by category label - only set while one of those two modes is active. */
  categoryColorOverrides?: { value: string; color: string }[];
  chartLegend: boolean;
  showLabels: boolean;
  showLabelsPercent: boolean;
  /** Data label text color: 'black' | 'white' | 'custom' (uses labelCustomColor). Defaults to black. */
  labelColorMode?: string;
  labelCustomColor?: string;
  showGridLines: boolean;
  useGradient: boolean;
  useRoundedBars: boolean;
  linkedDashboard: LinkedDashboardProps;
  /** KPI mini-chart mode (kpibar): no axes, no grid, no legend, shorter entrance. */
  compact?: boolean;
}
