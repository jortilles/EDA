import { ChartType, ChartDataSets, ChartOptions } from 'chart.js';

export class EdaChart {
    chartType: ChartType;
    chartData: any[] = [];
    chartDataset: ChartDataSets[] = [];
    chartLabels: string[] = [];
    chartColors: any[] = [];
    chartLegend: boolean = false;
    chartOptions: ChartOptions;
    chartPlugins: any[] = [];
}