import { LinkedDashboardProps } from "../eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props";

export class EdaDoughnutD3 {
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
  innerRadiusPercent: number;
  useGradient: boolean;
  linkedDashboard: LinkedDashboardProps;
  /** Radial sweep entrance animation on first render. On by default. */
  chartAnimation?: boolean;
}
