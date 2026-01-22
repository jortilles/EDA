import { LinkedDashboardProps } from '@eda/components/eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
import { ChartType, ChartDataset, ChartOptions, ChartData, ScatterDataPoint, BubbleDataPoint, ChartTypeRegistry } from 'chart.js';

export class EdaChart {
    public chartType: ChartType;
    // public chartData: ChartData<(ChartType), (number | ScatterDataPoint | BubbleDataPoint), string> [] = [];
    public chartData: ChartData<keyof ChartTypeRegistry, (number | ScatterDataPoint | BubbleDataPoint)[], string> = {
        labels: [],
        datasets: [],
    };
    // ChartData<ChartTypeRegistry, (number | ScatterDataPoint | BubbleDataPoint)[], string>
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
    showPointLines:boolean;
    showPredictionLines:boolean;
    numberOfColumns: number;

    constructor() { }
}
