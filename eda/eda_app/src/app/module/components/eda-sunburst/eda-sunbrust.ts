/** JJ: propietats que se li passen al component  tots els d3 son iguals*/
import { LinkedDashboardProps } from "../eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props";

export class SunBurst {
  size : { x: number, y: number; };
  id : string;
  data : { labels: any[], values: any[]; };
  dataDescription : any;
  colors : Array<string>;
  assignedColors : any[];
  linkedDashboard : LinkedDashboardProps;
}