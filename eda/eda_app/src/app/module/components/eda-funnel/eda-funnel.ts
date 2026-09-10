import { LinkedDashboardProps } from '@eda/components/eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
export class EdaFunnel {
  size : { x: number, y: number; };
  id : string;
  data : { labels: any[], values: any[]; };
  dataDescription : any;
  linkedDashboard : LinkedDashboardProps;
  assignedColors: any[];
  useGradient?: boolean;
  chartLegend?: boolean;
  chartAnimation?: boolean;
  /** per-category media-library images - see category-icons.util.ts */
  assignedIcons?: any[];
  useIcons?: boolean;
}