import { LinkedDashboardProps } from "../eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props";

export class ScatterPlot {
  size : { x: number, y: number; };
  id : string;
  data : { labels: any[], values: any[]; };
  dataDescription : any;
  colors : Array<string>;
  assignedColors : any[];
  linkedDashboard : LinkedDashboardProps;
}