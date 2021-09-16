import { LinkedDashboardProps } from '@eda/components/eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
import { ChartType, ChartDataSets, ChartOptions } from 'chart.js';

export class EdaChart {
    public chartType: ChartType;
    public chartData: any[] = [];
    public chartDataset: ChartDataSets[] = [];
    public chartLabels: string[] = [];
    public chartColors: any[] = [];
    public chartLegend: boolean = false;
    public chartOptions: ChartOptions;
    public chartPlugins: any[] = [];
    linkedDashboardProps : LinkedDashboardProps;
    addTrend: boolean;
    addComparative: boolean;

    constructor() { }
}
