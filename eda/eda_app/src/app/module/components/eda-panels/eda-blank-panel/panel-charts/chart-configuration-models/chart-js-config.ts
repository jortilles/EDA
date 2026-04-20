export class ChartJsConfig {
  colors: Array<{}>;
  chartType: string;
  addTrend : boolean;
  addComparative:boolean;
  showLabels:boolean;
  showLabelsPercent:boolean;
  showPointLines:boolean;
  showPredictionLines:boolean;
  numberOfColumns: number;
  assignedColors: any[];
  chartLegend: boolean;
  showGridLines: boolean;

  constructor(colors: Array<{}>, chartType:string, addTrend:boolean, addComparative:boolean, showLabels:boolean, showLabelsPercent:boolean, numberOfColumns:number, assignedColors: any[], showPointLines:boolean, showPredictionLines:boolean, chartLegend:boolean = true, showGridLines:boolean = true) {
    this.colors = colors;
    this.chartType = chartType;
    this.addTrend = addTrend;
    this.addComparative = addComparative;
    this.showLabels = showLabels;
    this.showLabelsPercent = showLabelsPercent;
    this.numberOfColumns = numberOfColumns;
    this.assignedColors = assignedColors;
    this.showPointLines = showPointLines;
    this.showPredictionLines = showPredictionLines;
    this.chartLegend = chartLegend;
    this.showGridLines = showGridLines;
  }
}