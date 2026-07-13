import { LinkedDashboardProps } from "../eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props";

export class EdaRadar {
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
  linkedDashboard: LinkedDashboardProps;
}
