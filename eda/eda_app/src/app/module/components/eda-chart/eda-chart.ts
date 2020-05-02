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
    public isBarline : boolean =  false;

    constructor() { }
}
