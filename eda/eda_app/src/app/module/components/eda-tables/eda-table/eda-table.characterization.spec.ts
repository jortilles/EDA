/**
 * Characterization (golden-master) tests for EdaTable.
 *
 * These do NOT assert that the current behavior is "correct" — they pin down what
 * eda-table.ts actually does today, so the upcoming split into eda-table-core /
 * eda-table / eda-crosstable can be verified against a known baseline instead of
 * relying on manual QA. If a captured value looks wrong, that's a finding to raise
 * before refactoring, not a reason to "fix" the test to match intuition.
 *
 * Run with: npm run test:characterization
 */
/// <reference types="jasmine" />
import { EdaTable } from './eda-table';
import { EdaColumnText } from './eda-columns/eda-column-text';
import { EdaColumnNumber } from './eda-columns/eda-column-number';

function colSummary(cols: any[]) {
  return cols.map(c => ({ field: c.field, header: c.header, type: c.type }));
}

// ---------------------------------------------------------------------------
// Plain table (pivot = false)
// ---------------------------------------------------------------------------
describe('EdaTable — plain table', () => {
  function buildPlainTable() {
    const cols = [
      new EdaColumnText({ header: 'Category', field: 'cat' }),
      new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
      new EdaColumnNumber({ header: 'Qty', field: 'qty' }),
    ];
    const t = new EdaTable({ cols });
    t.value = [
      { cat: 'A', amt: 10, qty: 1 },
      { cat: 'A', amt: 20, qty: 2 },
      { cat: 'B', amt: 5, qty: 3 },
      { cat: 'B', amt: 15, qty: 4 },
    ];
    return t;
  }

  it('coltotals() sums numeric columns and labels the text column', () => {
    const t = buildPlainTable();
    t.withColTotals = true;
    t.checkTotals(null);

    expect(t.totalsRow).toEqual([
      { data: 'Totales ', border: ' ', class: 'total-row-header', type: 'EdaColumnText' },
      { data: '50', style: 'right', class: 'total-row', border: '', type: 'EdaColumnNumber' },
      { data: '10', style: 'right', class: 'total-row', border: '', type: 'EdaColumnNumber' },
    ]);
  });

  it('colSubTotals() sums only the rows on the current page', () => {
    const t = buildPlainTable();
    t.rows = 2;
    t.initRows = 2;
    t.withColSubTotals = true;
    t.checkTotals({ first: 0, rows: 2 });

    expect(t.partialTotalsRow).toEqual([
      { data: 'SubTotales ', border: ' ', class: 'sub-total-row-header', type: 'EdaColumnText' },
      { data: '30', style: 'right', class: 'sub-total-row', border: '', type: 'EdaColumnNumber' },
      { data: '3', style: 'right', class: 'sub-total-row', border: '', type: 'EdaColumnNumber' },
    ]);
  });

  it('colsPercentages() adds a %-column per numeric column, and removePercentages() undoes it', () => {
    const t = buildPlainTable();

    t.resultAsPecentage = true;
    t.checkTotals(null);

    expect(colSummary(t.cols)).toEqual([
      { field: 'cat', header: 'Category', type: 'EdaColumnText' },
      { field: 'amt', header: 'Amount', type: 'EdaColumnNumber' },
      { field: 'amt%', header: 'Amount%', type: 'EdaColumnPercentage' },
      { field: 'qty', header: 'Qty', type: 'EdaColumnNumber' },
      { field: 'qty%', header: 'Qty%', type: 'EdaColumnPercentage' },
    ]);
    expect(t.value).toEqual([
      { cat: 'A', amt: 10, qty: 1, 'amt%': '20.00%', 'qty%': '10.00%' },
      { cat: 'A', amt: 20, qty: 2, 'amt%': '40.00%', 'qty%': '20.00%' },
      { cat: 'B', amt: 5, qty: 3, 'amt%': '10.00%', 'qty%': '30.00%' },
      { cat: 'B', amt: 15, qty: 4, 'amt%': '30.00%', 'qty%': '40.00%' },
    ] as any);

    t.resultAsPecentage = false;
    t.checkTotals(null);

    expect(colSummary(t.cols)).toEqual([
      { field: 'cat', header: 'Category', type: 'EdaColumnText' },
      { field: 'amt', header: 'Amount', type: 'EdaColumnNumber' },
      { field: 'qty', header: 'Qty', type: 'EdaColumnNumber' },
    ]);
  });

  it('sort() orders numeric columns numerically and text columns lexically', () => {
    const t = buildPlainTable();

    t.sort({ column: 'amt', sortState: true });
    expect(t.value.map((r: any) => r.amt)).toEqual([5, 10, 15, 20]);

    t.sort({ column: 'amt', sortState: false });
    expect(t.value.map((r: any) => r.amt)).toEqual([20, 15, 10, 5]);

    t.sort({ column: 'cat', sortState: true });
    expect(t.value.map((r: any) => r.cat)).toEqual(['A', 'A', 'B', 'B']);
  });
});

// ---------------------------------------------------------------------------
// Legacy pivot (single axis, no drag-drop `ordering`)
// ---------------------------------------------------------------------------
describe('EdaTable — legacy pivot (1-axis)', () => {
  function buildLegacyPivotTable() {
    const cols = [
      new EdaColumnText({ header: 'Region', field: 'region' }),
      new EdaColumnText({ header: 'Product', field: 'product' }),
      new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    ];
    const t = new EdaTable({ cols, pivot: true });
    // NOTE: leaving `ordering` as `undefined` (its default) makes rowTotals()/rowTrend()
    // throw once a series has more than 2 labels, because they read `this.ordering[0]`
    // without checking `this.ordering` itself first. Real callers that don't use the
    // drag-drop axes UI must set `ordering = []` explicitly to avoid that crash — this
    // fixture mirrors that requirement rather than exercising the crash.
    t.ordering = [];
    t.value = [
      { region: 'North', product: 'Chairs', amt: 10 },
      { region: 'North', product: 'Tables', amt: 20 },
      { region: 'South', product: 'Chairs', amt: 5 },
      { region: 'South', product: 'Tables', amt: 15 },
    ];
    return t;
  }

  it('PivotTable() pivots the "Product" values into columns per metric', () => {
    const t = buildLegacyPivotTable();

    expect(colSummary(t.cols)).toEqual([
      { field: 'region', header: 'Region', type: 'EdaColumnText' },
      { field: ' Chairs ~ amt', header: ' Chairs ~ amt', type: 'EdaColumnNumber' },
      { field: ' Tables ~ amt', header: ' Tables ~ amt', type: 'EdaColumnNumber' },
    ]);
    expect(t.value).toEqual([
      { region: 'North', ' Chairs ~ amt': 10, ' Tables ~ amt': 20 },
      { region: 'South', ' Chairs ~ amt': 5, ' Tables ~ amt': 15 },
    ] as any);
    expect(t.series).toEqual([
      {
        labels: [
          { title: 'Region', column: 'region', rowspan: 2, colspan: 1, sortable: true, description: undefined },
          { title: 'Amount', rowspan: 1, colspan: 2, description: undefined },
        ],
      },
      {
        labels: [
          { title: 'Chairs', rowspan: 1, colspan: 1, sortable: true, metric: 'Amount', column: ' Chairs ~ amt', sortState: false, description: undefined },
          { title: 'Tables', rowspan: 1, colspan: 1, sortable: true, metric: 'Amount', column: ' Tables ~ amt', sortState: false, description: undefined },
        ],
      },
    ] as any);
  });

  it('rowTotals() adds a synthetic total column summing every pivoted metric per row', () => {
    const t = buildLegacyPivotTable();
    t.withRowTotals = true;
    t.checkTotals(null);

    expect(colSummary(t.cols).map((c, i) => ({ ...c, rowTotal: t.cols[i].rowTotal }))).toEqual([
      { field: 'region', header: 'Region', type: 'EdaColumnText', rowTotal: false },
      { field: ' Chairs ~ amt', header: ' Chairs ~ amt', type: 'EdaColumnNumber', rowTotal: false },
      { field: ' Tables ~ amt', header: ' Tables ~ amt', type: 'EdaColumnNumber', rowTotal: false },
      { field: ' amt', header: ' amt', type: 'EdaColumnNumber', rowTotal: true },
    ]);
    expect(t.value).toEqual([
      { region: 'North', ' Chairs ~ amt': 10, ' Tables ~ amt': 20, ' amt': 30 },
      { region: 'South', ' Chairs ~ amt': 5, ' Tables ~ amt': 15, ' amt': 20 },
    ] as any);
  });

  it('colsPercentages() in pivot mode doubles the colspans of the matrix header', () => {
    const t = buildLegacyPivotTable();
    t.resultAsPecentage = true;
    t.checkTotals(null);

    expect(t.value).toEqual([
      { region: 'North', ' Chairs ~ amt': 10, ' Tables ~ amt': 20, ' Chairs ~ amt%': '66.67%', ' Tables ~ amt%': '57.14%' },
      { region: 'South', ' Chairs ~ amt': 5, ' Tables ~ amt': 15, ' Chairs ~ amt%': '33.33%', ' Tables ~ amt%': '42.86%' },
    ] as any);
    expect(t.series.map((s: any) => s.labels.map((l: any) => l.colspan))).toEqual([
      [1, 4],
      [2, 2],
    ]);
  });
});

// ---------------------------------------------------------------------------
// Cross table (2-axis drag-drop, via `ordering`)
// ---------------------------------------------------------------------------
describe('EdaTable — cross table (2-axis drag-drop)', () => {
  function buildCrossTable() {
    const cols = [
      new EdaColumnText({ header: 'Region', field: 'region' }),
      new EdaColumnText({ header: 'Product', field: 'product' }),
      new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    ];
    const t = new EdaTable({ cols, pivot: true });
    t.ordering = [{
      axes: [{
        itemX: [{ column_name: 'region', description: 'Region' }],
        itemY: [{ column_name: 'product', description: 'Product' }],
        // itemZ matches columns by `description` === col.header, NOT by column_name/field —
        // an inconsistency with itemX/itemY (which match by column_name === col.field).
        itemZ: [{ column_name: 'amt', description: 'Amount' }],
      }],
    }];
    t.value = [
      { region: 'North', product: 'Chairs', amt: 10 },
      { region: 'North', product: 'Tables', amt: 20 },
      { region: 'South', product: 'Chairs', amt: 5 },
      { region: 'South', product: 'Tables', amt: 15 },
    ];
    return t;
  }

  it('PivotTable() cross-path produces the same row/col shape as the legacy pivot path for 1x1 axes', () => {
    const t = buildCrossTable();

    expect(colSummary(t.cols)).toEqual([
      { field: 'region', header: 'Region', type: 'EdaColumnText' },
      { field: ' Chairs ~ amt', header: ' Chairs ~ amt', type: 'EdaColumnNumber' },
      { field: ' Tables ~ amt', header: ' Tables ~ amt', type: 'EdaColumnNumber' },
    ]);
    expect(t.value).toEqual([
      { region: 'North', ' Chairs ~ amt': 10, ' Tables ~ amt': 20 },
      { region: 'South', ' Chairs ~ amt': 5, ' Tables ~ amt': 15 },
    ] as any);
  });

  it('crossSortOrder must be set BEFORE assigning `.value`, since PivotTable() reads it inside the value setter', () => {
    function build(crossSortOrder: string) {
      const cols = [
        new EdaColumnText({ header: 'Region', field: 'region' }),
        new EdaColumnText({ header: 'Product', field: 'product' }),
        new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
      ];
      const t = new EdaTable({ cols, pivot: true });
      t.ordering = [{
        axes: [{
          itemX: [{ column_name: 'region', description: 'Region' }],
          itemY: [{ column_name: 'product', description: 'Product' }],
          itemZ: [{ column_name: 'amt', description: 'Amount' }],
        }],
      }];
      t.crossSortOrder = crossSortOrder; // must happen before `.value =` below
      // "Alpha" sorts first alphabetically but has the smaller total; "Zulu" is the opposite.
      t.value = [
        { region: 'Alpha', product: 'Chairs', amt: 1 },
        { region: 'Alpha', product: 'Tables', amt: 1 },
        { region: 'Zulu', product: 'Chairs', amt: 50 },
        { region: 'Zulu', product: 'Tables', amt: 50 },
      ];
      return t;
    }

    expect(build('alphabetical').value.map((r: any) => r.region)).toEqual(['Alpha', 'Zulu']);
    expect(build('value').value.map((r: any) => r.region)).toEqual(['Zulu', 'Alpha']);
  });
});
