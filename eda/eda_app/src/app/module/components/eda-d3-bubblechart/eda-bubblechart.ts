import { LinkedDashboardProps } from '@eda/components/eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
export class EdaBubblechart {
  size : { x: number, y: number; };
  id : string;
  data : { labels: any[], values: any[]; };
  dataDescription : any;
  colors : Array<string>;
  linkedDashboard : LinkedDashboardProps;
}