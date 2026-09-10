/**
 * Re-runs the plain-table assertions from eda-table.characterization.spec.ts against
 * EdaTableModel (base + totals + color + FlatHeaderModel composed together), confirming
 * the composed model behaves identically to the original EdaTable for pivot=false.
 */
/// <reference types="jasmine" />
import { EdaTableModel } from './eda-table.model';
import { EdaColumnText } from './eda-columns/eda-column-text';
import { EdaColumnNumber } from './eda-columns/eda-column-number';

function buildPlainTable() {
  const cols = [
    new EdaColumnText({ header: 'Category', field: 'cat' }),
    new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    new EdaColumnNumber({ header: 'Qty', field: 'qty' }),
  ];
  const t = new EdaTableModel({ cols });
  t.value = [
    { cat: 'A', amt: 10, qty: 1 },
    { cat: 'A', amt: 20, qty: 2 },
    { cat: 'B', amt: 5, qty: 3 },
    { cat: 'B', amt: 15, qty: 4 },
  ];
  return t;
}

describe('EdaTableModel — matches eda-table.characterization.spec.ts', () => {
  it('coltotals via checkTotals() sums numeric columns and labels the text column', () => {
    const t = buildPlainTable();
    t.withColTotals = true;
    t.checkTotals(null);

    expect(t.totalsRow).toEqual([
      { data: 'Totales ', border: ' ', class: 'total-row-header', type: 'EdaColumnText' },
      { data: '50', style: 'right', class: 'total-row', border: '', type: 'EdaColumnNumber' },
      { data: '10', style: 'right', class: 'total-row', border: '', type: 'EdaColumnNumber' },
    ] as any);
  });

  it('colSubTotals via checkTotals() sums only the rows on the current page', () => {
    const t = buildPlainTable();
    t.rows = 2;
    t.initRows = 2;
    t.withColSubTotals = true;
    t.checkTotals({ first: 0, rows: 2 });

    expect(t.partialTotalsRow).toEqual([
      { data: 'SubTotales ', border: ' ', class: 'sub-total-row-header', type: 'EdaColumnText' },
      { data: '30', style: 'right', class: 'sub-total-row', border: '', type: 'EdaColumnNumber' },
      { data: '3', style: 'right', class: 'sub-total-row', border: '', type: 'EdaColumnNumber' },
    ] as any);
  });

  it('colsPercentages/removePercentages via checkTotals() adds and removes a %-column per numeric column', () => {
    const t = buildPlainTable();

    t.resultAsPecentage = true;
    t.checkTotals(null);

    expect(t.cols.map(c => ({ field: c.field, header: c.header, type: c.type }))).toEqual([
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

    expect(t.cols.map(c => ({ field: c.field, header: c.header, type: c.type }))).toEqual([
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

  it('noRepeatedRows blanks out repeated non-numeric values on checkTotals() when noRepetitions=true', () => {
    const t = buildPlainTable();
    t.noRepetitions = true;
    t.checkTotals(null);

    expect(t.value.map((r: any) => r.cat)).toEqual(['A', '', 'B', '']);
  });
});
