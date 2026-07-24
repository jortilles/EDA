import { LinkedDashboardProps } from "../eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props";

export class EdaPolarArea {
  id: string;
  size: { x: number, y: number; };
  chartType: string;
  edaChart: string;
  chartLabels: string[];
  chartDataset: any[];
  chartColors: any[];
  assignedColors: any[];
  chartLegend: boolean;
  showLabels: boolean;
  showLabelsPercent: boolean;
  showGridLines: boolean;
  useGradient: boolean;
  linkedDashboard: LinkedDashboardProps;
  /** Grow-out-from-center entrance animation on first render. On by default. */
  chartAnimation?: boolean;
}
