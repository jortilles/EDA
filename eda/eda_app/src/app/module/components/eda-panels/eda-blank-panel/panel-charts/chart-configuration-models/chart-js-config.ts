export class ChartJsConfig {
  colors: Array<{}>;
  chartType: string;

  constructor(colors: Array<{}>, chartType:string) {
    this.colors = colors;
    this.chartType = chartType
    
  }
}