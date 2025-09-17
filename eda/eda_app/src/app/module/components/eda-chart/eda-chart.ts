import { LinkedDashboardProps } from '@eda/components/eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
import { ChartType, ChartDataset, ChartOptions } from 'chart.js';



export class EdaChart {
  public chartType: ChartType | "horizontalBar";
  public chartData: any[] = [];
  public chartDataset: ChartDataset[] = [];
  public chartLabels: string[] = [];
  public chartColors: any[] = [];
  public charcoloms: any[] = [];
  public chartLegend: boolean = false;
  public chartOptions: ChartOptions;
  public chartPlugins: any[] = [];
  linkedDashboardProps : LinkedDashboardProps;
  addTrend: boolean;
  addComparative: boolean;
  showLabels:boolean;
  showLabelsPercent:boolean;
  numberOfColumns: number;

  constructor() { }
}
