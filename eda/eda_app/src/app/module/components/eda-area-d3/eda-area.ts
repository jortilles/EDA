import { LinkedDashboardProps } from "../eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props";

export class EdaAreaD3 {
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
  /** Data label text color: 'black' | 'white' | 'custom' (uses labelCustomColor). Defaults to black. */
  labelColorMode?: string;
  labelCustomColor?: string;
  showGridLines: boolean;
  showPointLines: boolean;
  useGradient: boolean;
  linkedDashboard: LinkedDashboardProps;
  /** KPI mini-chart mode: no axes, no grid, no legend, shorter entrance. */
  compact?: boolean;
  /** Sequential left-to-right entrance animation on first render. On by default. */
  chartAnimation?: boolean;
}
