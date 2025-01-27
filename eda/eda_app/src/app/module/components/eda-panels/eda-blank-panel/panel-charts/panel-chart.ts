import { DashboardStyles } from '@eda/services/service.index';
import { LinkedDashboardProps } from '../link-dashboards/link-dashboard-props';
import { ChartConfig } from './chart-configuration-models/chart-config';


export class PanelChart {
  public data: { labels: any[]; values: any[] };
  public query: any;
  public chartType: string;
  public config: ChartConfig;
  public edaChart: string;
  public maps: Array<string>;
  public size: { x: number; y: number };
  public linkedDashboardProps: LinkedDashboardProps;
  public addTrend: boolean;
  public noRepetitions: boolean;
  public draggable: boolean;
  public coordinates: Array<Array<number>>;
  public zoom: number;

  constructor(init?: Partial<PanelChart>) {
    Object.assign(this, init);
  }
}
