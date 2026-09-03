/**
 * Re-runs the SAME assertions as eda-table.characterization.spec.ts's coltotals()/
 * colSubTotals()/colsPercentages()/removePercentages()/rowTotals() tests, but against
 * the new pure functions in eda-table.totals.ts, via a minimal test-only TotalsContext
 * adapter. Byte-identical expected values to the original spec confirms the extraction
 * didn't change behavior — this is the highest-value regression net for this refactor,
 * since it's where the `if(this.pivot)` branches actually get deleted.
 *
 * Note: this adapter's replaceRows() is a plain assignment, NOT the full `value` setter
 * semantics (filter re-init) that the real EdaTable class has — none of these fixtures
 * use column filters, so that gap doesn't affect these tests. Phase 5 wires the real
 * setter semantics into the production model classes.
 */
/// <reference types="jasmine" />
import { EdaColumnText } from '../eda-table/eda-columns/eda-column-text';
import { EdaColumnNumber } from '../eda-table/eda-columns/eda-column-number';
import { EdaColumn } from '../eda-table/eda-columns/eda-column';
import { FlatHeaderModel, MatrixHeaderModel, HeaderRow } from './eda-table.header';
import {
  TotalsContext,
  CellAggregationStrategy,
  FlatCellAggregation,
  MatrixCellAggregation,
  coltotals,
  colSubTotals,
  colsPercentages,
  removePercentages,
  rowTotals,
  rowTrend,
  deleteRowTotals,
  deleteTrend,
  noRepeatedRows,
} from './eda-table.totals';

class TestTotalsContext implements TotalsContext {
  initRows = 10;
  totalsLabel = 'Totales';
  subTotalsLabel = 'SubTotales';
  trendLabel = 'Tendencia';

  constructor(
    private rows: any[],
    private cols: EdaColumn[],
    public header: import('./eda-table.header').HeaderModel,
    public cellAggregation: CellAggregationStrategy,
  ) {}

  getRows() { return this.rows; }
  replaceRows(rows: any[]) { this.rows = rows; }
  getCols() { return this.cols; }
  setCols(cols: EdaColumn[]) { this.cols = cols; }
}

function buildFlatFixture() {
  const cols = [
    new EdaColumnText({ header: 'Category', field: 'cat' }),
    new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    new EdaColumnNumber({ header: 'Qty', field: 'qty' }),
  ];
  const rows = [
    { cat: 'A', amt: 10, qty: 1 },
    { cat: 'A', amt: 20, qty: 2 },
    { cat: 'B', amt: 5, qty: 3 },
    { cat: 'B', amt: 15, qty: 4 },
  ];
  const ctx = new TestTotalsContext(rows, cols, new FlatHeaderModel(() => cols), new FlatCellAggregation());
  return ctx;
}

describe('eda-table.totals — flat table (matches eda-table.characterization.spec.ts)', () => {
  it('coltotals() sums numeric columns and labels the text column', () => {
    const ctx = buildFlatFixture();
    expect(coltotals(ctx)).toEqual([
      { data: 'Totales ', border: ' ', class: 'total-row-header', type: 'EdaColumnText' },
      { data: '50', style: 'right', class: 'total-row', border: '', type: 'EdaColumnNumber' },
      { data: '10', style: 'right', class: 'total-row', border: '', type: 'EdaColumnNumber' },
    ] as any);
  });

  it('colSubTotals() sums only the rows on the current page', () => {
    const ctx = buildFlatFixture();
    ctx.initRows = 2;
    expect(colSubTotals(ctx, 1)).toEqual([
      { data: 'SubTotales ', border: ' ', class: 'sub-total-row-header', type: 'EdaColumnText' },
      { data: '30', style: 'right', class: 'sub-total-row', border: '', type: 'EdaColumnNumber' },
      { data: '3', style: 'right', class: 'sub-total-row', border: '', type: 'EdaColumnNumber' },
    ] as any);
  });

  it('colsPercentages() adds a %-column per numeric column, and removePercentages() undoes it', () => {
    const ctx = buildFlatFixture();
    const percentageColumnsRef = { value: [] as EdaColumn[] };

    colsPercentages(ctx, percentageColumnsRef, false);

    expect(ctx.getCols().map(c => ({ field: c.field, header: c.header, type: c.type }))).toEqual([
      { field: 'cat', header: 'Category', type: 'EdaColumnText' },
      { field: 'amt', header: 'Amount', type: 'EdaColumnNumber' },
      { field: 'amt%', header: 'Amount%', type: 'EdaColumnPercentage' },
      { field: 'qty', header: 'Qty', type: 'EdaColumnNumber' },
      { field: 'qty%', header: 'Qty%', type: 'EdaColumnPercentage' },
    ]);
    expect(ctx.getRows()).toEqual([
      { cat: 'A', amt: 10, qty: 1, 'amt%': '20.00%', 'qty%': '10.00%' },
      { cat: 'A', amt: 20, qty: 2, 'amt%': '40.00%', 'qty%': '20.00%' },
      { cat: 'B', amt: 5, qty: 3, 'amt%': '10.00%', 'qty%': '30.00%' },
      { cat: 'B', amt: 15, qty: 4, 'amt%': '30.00%', 'qty%': '40.00%' },
    ] as any);

    removePercentages(ctx, percentageColumnsRef);

    expect(ctx.getCols().map(c => ({ field: c.field, header: c.header, type: c.type }))).toEqual([
      { field: 'cat', header: 'Category', type: 'EdaColumnText' },
      { field: 'amt', header: 'Amount', type: 'EdaColumnNumber' },
      { field: 'qty', header: 'Qty', type: 'EdaColumnNumber' },
    ]);
  });
});

function buildLegacyPivotFixture() {
  const cols = [
    new EdaColumnText({ header: 'Region', field: 'region' }),
    new EdaColumnNumber({ header: ' Chairs ~ amt', field: ' Chairs ~ amt' }),
    new EdaColumnNumber({ header: ' Tables ~ amt', field: ' Tables ~ amt' }),
  ];
  const rows = [
    { region: 'North', ' Chairs ~ amt': 10, ' Tables ~ amt': 20 },
    { region: 'South', ' Chairs ~ amt': 5, ' Tables ~ amt': 15 },
  ];
  const series: HeaderRow[] = [
    { labels: [
      { title: 'Region', column: 'region', rowspan: 2, colspan: 1, sortable: true },
      { title: 'Amount', rowspan: 1, colspan: 2 },
    ] },
    { labels: [
      { title: 'Chairs', rowspan: 1, colspan: 1, sortable: true, metric: 'Amount', column: ' Chairs ~ amt', sortState: false },
      { title: 'Tables', rowspan: 1, colspan: 1, sortable: true, metric: 'Amount', column: ' Tables ~ amt', sortState: false },
    ] },
  ];
  const header = new MatrixHeaderModel(series, 1, false);
  const ctx = new TestTotalsContext(rows, cols, header, new MatrixCellAggregation());
  return { ctx, series };
}

describe('eda-table.totals — legacy pivot / matrix (matches eda-table.characterization.spec.ts)', () => {
  it('rowTotals() adds a synthetic total column summing every pivoted metric per row', () => {
    const { ctx } = buildLegacyPivotFixture();

    rowTotals(ctx);

    expect(ctx.getCols().map(c => ({ field: c.field, header: c.header, type: c.type, rowTotal: c.rowTotal }))).toEqual([
      { field: 'region', header: 'Region', type: 'EdaColumnText', rowTotal: false },
      { field: ' Chairs ~ amt', header: ' Chairs ~ amt', type: 'EdaColumnNumber', rowTotal: false },
      { field: ' Tables ~ amt', header: ' Tables ~ amt', type: 'EdaColumnNumber', rowTotal: false },
      { field: ' amt', header: ' amt', type: 'EdaColumnNumber', rowTotal: true },
    ]);
    expect(ctx.getRows()).toEqual([
      { region: 'North', ' Chairs ~ amt': 10, ' Tables ~ amt': 20, ' amt': 30 },
      { region: 'South', ' Chairs ~ amt': 5, ' Tables ~ amt': 15, ' amt': 20 },
    ] as any);
  });

  it('colsPercentages() in pivot mode doubles the colspans of the matrix header', () => {
    const { ctx, series } = buildLegacyPivotFixture();
    const percentageColumnsRef = { value: [] as EdaColumn[] };

    colsPercentages(ctx, percentageColumnsRef, false);

    expect(ctx.getRows()).toEqual([
      { region: 'North', ' Chairs ~ amt': 10, ' Tables ~ amt': 20, ' Chairs ~ amt%': '66.67%', ' Tables ~ amt%': '57.14%' },
      { region: 'South', ' Chairs ~ amt': 5, ' Tables ~ amt': 15, ' Chairs ~ amt%': '33.33%', ' Tables ~ amt%': '42.86%' },
    ] as any);
    expect(series.map(s => s.labels.map(l => l.colspan))).toEqual([[1, 4], [2, 2]]);
  });

  it('colSubTotals() in matrix mode sums only the page (row 0) and gives a trend column a text percentage instead of blank', () => {
    const { ctx } = buildLegacyPivotFixture();
    ctx.initRows = 1; // page 1 = row 0 (North) only
    rowTrend(ctx); // adds an EdaColumnChart trailing column, exercising nonNumericSubtotalCell()

    const result = colSubTotals(ctx, 1);

    expect(result[0]).toEqual({ data: 'SubTotales ', border: ' ', class: 'sub-total-row-header', type: 'EdaColumnText' } as any);
    expect(result[1]).toEqual({ data: '10', style: 'right', class: 'sub-total-row', border: '', type: 'EdaColumnNumber' } as any); // North's Chairs value only
    expect(result[2]).toEqual({ data: '20', style: 'right', class: 'sub-total-row', border: '', type: 'EdaColumnNumber' } as any); // North's Tables value only
    // The trend column is EdaColumnChart — not numeric/percentage/first-non-numeric —
    // so it goes through CellAggregationStrategy.nonNumericSubtotalCell(). Its value is
    // always 0.00% here: sumPartialRows() only accumulates EdaColumnNumber columns, so
    // the EdaColumnChart column's own field is never summed — a preexisting quirk of the
    // original code (the same computation, same gap), not something this port introduced.
    expect(result[3]).toEqual({ data: '0.00%', border: ' ', class: 'sub-total-row-header text-right', type: 'EdaColumnChart' } as any);
  });

  it('deleteRowTotals() removes the synthetic column and its header entries added by rowTotals()', () => {
    const { ctx, series } = buildLegacyPivotFixture();
    const originalColCount = ctx.getCols().length;
    const originalLastRowLength = series[series.length - 1].labels.length;

    rowTotals(ctx);
    expect(ctx.getCols().length).toBe(originalColCount + 1);

    deleteRowTotals(ctx);

    expect(ctx.getCols().length).toBe(originalColCount);
    expect(ctx.getCols().some(c => c.rowTotal)).toBe(false);
    expect(series[series.length - 1].labels.length).toBe(originalLastRowLength);
    expect(series[0].labels.some(l => l.isTotal)).toBe(false); // 2-row series: series[0] === series[length-2]
  });

  it('deleteTrend() removes the synthetic column and its header entries added by rowTrend(), and is safe to call with nothing to remove', () => {
    const { ctx, series } = buildLegacyPivotFixture();
    const originalColCount = ctx.getCols().length;
    const originalLastRowLength = series[series.length - 1].labels.length;

    // Safe no-op per the original deleteTrend(), which has no guard at all.
    expect(() => deleteTrend(ctx)).not.toThrow();
    expect(ctx.getCols().length).toBe(originalColCount);

    rowTrend(ctx);
    expect(ctx.getCols().length).toBe(originalColCount + 1);

    deleteTrend(ctx);

    expect(ctx.getCols().length).toBe(originalColCount);
    expect(series[series.length - 1].labels.length).toBe(originalLastRowLength);
  });
});

describe('eda-table.totals — noRepeatedRows (plain-table-only)', () => {
  function buildRepeatedRowsFixture() {
    const cols = [
      new EdaColumnText({ header: 'Category', field: 'cat' }),
      new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    ];
    const rows = [
      { cat: 'A', amt: 10 },
      { cat: 'A', amt: 20 },
      { cat: 'B', amt: 5 },
    ];
    const ctx = new TestTotalsContext(rows, cols, new FlatHeaderModel(() => cols), new FlatCellAggregation());
    return ctx;
  }

  it('does nothing when noRepetitions is undefined', () => {
    const ctx = buildRepeatedRowsFixture();
    const before = ctx.getRows();
    noRepeatedRows(ctx, before, { noRepetitions: undefined, resultAsPecentage: false, onlyPercentages: false });
    expect(ctx.getRows()).toBe(before);
  });

  it('blanks out a repeated non-numeric value in consecutive rows when noRepetitions is true', () => {
    const ctx = buildRepeatedRowsFixture();
    const origValues = ctx.getRows();

    noRepeatedRows(ctx, origValues, { noRepetitions: true, resultAsPecentage: false, onlyPercentages: false });

    const out: any = ctx.getRows();
    expect(out[0].cat).toBe('A');
    expect(out[1].cat).toBe(''); // repeated 'A' -> blanked
    expect(out[2].cat).toBe('B');
  });

  it('restores the full original values when noRepetitions is false (undoing a prior blank-out)', () => {
    const ctx = buildRepeatedRowsFixture();
    const origValues = ctx.getRows();
    noRepeatedRows(ctx, origValues, { noRepetitions: true, resultAsPecentage: false, onlyPercentages: false });
    expect((ctx.getRows() as any)[1].cat).toBe(''); // confirm it's actually blanked first

    noRepeatedRows(ctx, origValues, { noRepetitions: false, resultAsPecentage: false, onlyPercentages: false });

    expect(ctx.getRows()).toEqual(origValues);
  });
});
