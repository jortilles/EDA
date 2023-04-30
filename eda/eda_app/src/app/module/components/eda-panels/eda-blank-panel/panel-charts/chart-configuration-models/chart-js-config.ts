export class ChartJsConfig {
  colors: Array<{}>;
  chartType: string;
  addTrend : boolean;
  addComparative:boolean;
  showLabels:boolean;
  showLabelsPercent:boolean;
  numberOfColumns:number;

  constructor(colors: Array<{}>, chartType:string, addTrend:boolean, addComparative:boolean, showLabels:boolean, showLabelsPercent:boolean, numberOfColumns:number) {
    this.colors = colors;
    this.chartType = chartType;
    this.addTrend = addTrend;
    this.addComparative = addComparative;
    this.showLabels = showLabels;
    this.showLabelsPercent = showLabelsPercent;
    this.numberOfColumns = numberOfColumns;
    
  }
}