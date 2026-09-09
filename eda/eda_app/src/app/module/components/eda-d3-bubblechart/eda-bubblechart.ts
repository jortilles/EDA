import { LinkedDashboardProps } from '@eda/components/eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
export class EdaBubblechart {
  size : { x: number, y: number; };
  id : string;
  data : { labels: any[], values: any[]; };
  dataDescription : any;
  colors : Array<string>;
  linkedDashboard : LinkedDashboardProps;
  assignedColors: any[];
  /** Per-category icon URL ({value, icon}[]) + master on/off switch - same shape/lifecycle as
   * eda-race-bar's assignedIcons/useIcons. */
  assignedIcons?: any[];
  useIcons?: boolean;
  useGradient?: boolean;
  chartLegend?: boolean;
  chartAnimation?: boolean;
}