import { LinkedDashboardProps } from './../eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';

export class EdaMap{

  div_name : string ;
  coordinates : Array<Array<number>>;
  zoom : number;
  data : any;
  color:string;
  initialColor:string;
  finalColor:string;
  legendPosition:string;
  logarithmicScale : boolean;
  draggable : boolean;
  labels : Array<string>;
  maps : Array<Object>;
  query: Array<any>;
  linkedDashboard : LinkedDashboardProps;
  baseLayer: boolean;

}