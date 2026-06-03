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
  negativeNumbers: boolean;
  /** Sort mode for cross/pivot tables: 'alphabetical' | 'value' (desc) | 'valueAsc' (asc). */
  crossSortOrder: string;
  /** Hex color for table header background. Empty string = use corporate primary. */
  headerColor: string;
  /** Hex color for even-row banding background. Empty string = use tinted corporate primary. */
  bandingColor: string;
  /** When false, header and banding are transparent (white/no color). */
  colorEnabled: boolean;

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
    negativeNumbers: boolean,
    ordering: any[],
    crossSortOrder: string = 'alphabetical',
    headerColor: string = '',
    bandingColor: string = '',
    colorEnabled: boolean = true,
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
      this.negativeNumbers = negativeNumbers;
      this.crossSortOrder = crossSortOrder;
      this.headerColor = headerColor;
      this.bandingColor = bandingColor;
      this.colorEnabled = colorEnabled;
  }

}