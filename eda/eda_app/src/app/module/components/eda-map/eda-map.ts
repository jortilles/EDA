import { LinkedDashboardProps } from './../eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
export class EdaMap {
  div_name: string;
  mapID: string;
  data: any;
  dataDescription: any;
  coordinates: any;
  zoom: number;
  legendPosition?: string;
  baseLayer?: boolean;
  draggable?: boolean;
  logarithmicScale?: boolean;
  groups?: number[];
  assignedColors?: Array<{value: string, color: string}>; // ← AÑADIR ESTO
  color:string;
  initialColor:string;
  finalColor:string;
  labels : Array<string>;
  maps : Array<Object>;
  query: Array<any>;
  linkedDashboard : LinkedDashboardProps;
}