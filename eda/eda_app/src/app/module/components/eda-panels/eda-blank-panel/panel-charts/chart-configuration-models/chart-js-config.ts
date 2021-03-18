export class ChartJsConfig {
  colors: Array<{}>;
  chartType: string;
  addTrend : boolean;

  constructor(colors: Array<{}>, chartType:string, addTrend:boolean) {
    this.colors = colors;
    this.chartType = chartType;
    this.addTrend = addTrend;
    
  }
}