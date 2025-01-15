export class TableConfig {
  onlyPercentages: Boolean;
  resultAsPecentage: Boolean;
  visibleRows: number;
  withColSubTotals: Boolean;
  withColTotals: Boolean;
  withRowTotals: Boolean;
  withTrend : Boolean; 
  sortedSerie : any;
  sortedColumn : any;
  styles : Array<any>;
  noRepetitions: boolean;
  ordering: any[];

  constructor(
    onlyPercentages: Boolean, 
    resultAsPecentage: Boolean,
    visibleRows: number,
    withColSubTotals: Boolean,
    withColTotals: Boolean,
    withRowTotals: Boolean,
    withTrend:Boolean,
    sortedSerie :any,
    sortedColumn : any,
    styles : Array<any>,
    noRepetitions: boolean,
    ordering: any[],
    ) {
      this.onlyPercentages = onlyPercentages;
      this.resultAsPecentage = resultAsPecentage;
      this.visibleRows = visibleRows;
      this.withColSubTotals = withColSubTotals;
      this.withColTotals = withColTotals;
      this.withRowTotals = withRowTotals;
      this.withTrend = withTrend;
      this.sortedSerie = sortedSerie;
      this.sortedColumn = sortedColumn;
      this.styles = styles;
      this.noRepetitions = noRepetitions;
      this.ordering = ordering;
  }

}