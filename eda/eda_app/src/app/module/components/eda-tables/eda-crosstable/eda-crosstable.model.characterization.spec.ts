/**
 * Re-runs the legacy-pivot and cross-table assertions from
 * eda-table.characterization.spec.ts against EdaCrosstableModel (base + totals + color +
 * MatrixHeaderModel + the unified engine composed together), confirming the composed
 * model behaves identically to the original EdaTable for pivot=true.
 */
/// <reference types="jasmine" />
import { EdaCrosstableModel } from './eda-crosstable.model';
import { EdaColumnText } from '../eda-table/eda-columns/eda-column-text';
import { EdaColumnNumber } from '../eda-table/eda-columns/eda-column-number';

function colSummary(cols: any[]) {
  return cols.map(c => ({ field: c.field, header: c.header, type: c.type }));
}

describe('EdaCrosstableModel — legacy pivot (1-axis), matches eda-table.characterization.spec.ts', () => {
  function buildLegacyPivotTable() {
    const cols = [
      new EdaColumnText({ header: 'Region', field: 'region' }),
      new EdaColumnText({ header: 'Product', field: 'product' }),
      new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    ];
    const t = new EdaCrosstableModel({ cols });
    t.ordering = [];
    t.value = [
      { region: 'North', product: 'Chairs', amt: 10 },
      { region: 'North', product: 'Tables', amt: 20 },
      { region: 'South', product: 'Chairs', amt: 5 },
      { region: 'South', product: 'Tables', amt: 15 },
    ];
    return t;
  }

  it('pivots the "Product" values into columns per metric, same as PivotTable()', () => {
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
    expect(t.header.getRows()).toEqual([
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

  it('rowTotals via checkTotals() adds a synthetic total column summing every pivoted metric per row', () => {
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

  it('colsPercentages via checkTotals() in pivot mode doubles the colspans of the matrix header', () => {
    const t = buildLegacyPivotTable();
    t.resultAsPecentage = true;
    t.checkTotals(null);

    expect(t.value).toEqual([
      { region: 'North', ' Chairs ~ amt': 10, ' Tables ~ amt': 20, ' Chairs ~ amt%': '66.67%', ' Tables ~ amt%': '57.14%' },
      { region: 'South', ' Chairs ~ amt': 5, ' Tables ~ amt': 15, ' Chairs ~ amt%': '33.33%', ' Tables ~ amt%': '42.86%' },
    ] as any);
    expect(t.header.getRows().map(s => s.labels.map(l => l.colspan))).toEqual([[1, 4], [2, 2]]);
  });
});

describe('EdaCrosstableModel — cross table (2-axis drag-drop), matches eda-table.characterization.spec.ts', () => {
  function buildCrossTableFixture() {
    const cols = [
      new EdaColumnText({ header: 'Region', field: 'region' }),
      new EdaColumnText({ header: 'Product', field: 'product' }),
      new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    ];
    const t = new EdaCrosstableModel({ cols });
    t.ordering = [{
      axes: [{
        itemX: [{ column_name: 'region', description: 'Region' }],
        itemY: [{ column_name: 'product', description: 'Product' }],
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

  it('produces the same row/col shape as PivotTable() cross-path for 1x1 axes', () => {
    const t = buildCrossTableFixture();

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

  it('crossSortOrder must be set BEFORE assigning `.value`, since onValueAssigned() reads it inside the value setter', () => {
    function build(crossSortOrder: string) {
      const cols = [
        new EdaColumnText({ header: 'Region', field: 'region' }),
        new EdaColumnText({ header: 'Product', field: 'product' }),
        new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
      ];
      const t = new EdaCrosstableModel({ cols });
      t.ordering = [{
        axes: [{
          itemX: [{ column_name: 'region', description: 'Region' }],
          itemY: [{ column_name: 'product', description: 'Product' }],
          itemZ: [{ column_name: 'amt', description: 'Amount' }],
        }],
      }];
      t.crossSortOrder = crossSortOrder;
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
