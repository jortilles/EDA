export class TableConfig {
  onlyPercentages: Boolean;
  resultAsPecentage: Boolean;
  visibleRows: number;
  withColSubTotals: Boolean;
  withColTotals: Boolean;
  withRowTotals: Boolean;
  withTrend : Boolean; 

  constructor(
    onlyPercentages: Boolean, 
    resultAsPecentage: Boolean,
    visibleRows: number,
    withColSubTotals: Boolean,
    withColTotals: Boolean,
    withRowTotals: Boolean,
    withTrend:Boolean) {
      this.onlyPercentages = onlyPercentages;
      this.resultAsPecentage = resultAsPecentage;
      this.visibleRows = visibleRows;
      this.withColSubTotals = withColSubTotals;
      this.withColTotals = withColTotals;
      this.withRowTotals = withRowTotals;
      this.withTrend = withTrend
  }

}