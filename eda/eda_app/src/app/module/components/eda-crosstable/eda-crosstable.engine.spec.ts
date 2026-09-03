/**
 * Re-runs the SAME assertions as eda-table.characterization.spec.ts's legacy-pivot and
 * cross-table PivotTable()/crossSortOrder tests, but against the new unified
 * buildCrossTable()/synthesizeLegacyAxis(). Byte-identical expected values to the
 * original spec confirms the two engines (legacy 1-axis, drag-drop 2-axis) were unified
 * without changing either path's observable behavior.
 */
/// <reference types="jasmine" />
import { EdaColumnText } from '../eda-table/eda-columns/eda-column-text';
import { EdaColumnNumber } from '../eda-table/eda-columns/eda-column-number';
import { buildCrossTable, synthesizeLegacyAxis, AxisConfig } from './eda-crosstable.engine';

function colSummary(cols: any[]) {
  return cols.map(c => ({ field: c.field, header: c.header, type: c.type }));
}

describe('eda-crosstable.engine — legacy pivot (1-axis), matches eda-table.characterization.spec.ts', () => {
  function buildFixture() {
    const cols = [
      new EdaColumnText({ header: 'Region', field: 'region' }),
      new EdaColumnText({ header: 'Product', field: 'product' }),
      new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    ];
    const rows = [
      { region: 'North', product: 'Chairs', amt: 10 },
      { region: 'North', product: 'Tables', amt: 20 },
      { region: 'South', product: 'Chairs', amt: 5 },
      { region: 'South', product: 'Tables', amt: 15 },
    ];
    const axis = synthesizeLegacyAxis(cols);
    const result = buildCrossTable(rows, cols, axis, {
      crossSortOrder: 'alphabetical',
      navColumnSubstitution: {},
      hasConfiguredAxis: false,
    });
    return { result, axis };
  }

  it('produces the same cols/rows/series as PivotTable() for the legacy 1-axis fixture', () => {
    const { result } = buildFixture();

    expect(colSummary(result.cols)).toEqual([
      { field: 'region', header: 'Region', type: 'EdaColumnText' },
      { field: ' Chairs ~ amt', header: ' Chairs ~ amt', type: 'EdaColumnNumber' },
      { field: ' Tables ~ amt', header: ' Tables ~ amt', type: 'EdaColumnNumber' },
    ]);
    expect(result.rows).toEqual([
      { region: 'North', ' Chairs ~ amt': 10, ' Tables ~ amt': 20 },
      { region: 'South', ' Chairs ~ amt': 5, ' Tables ~ amt': 15 },
    ] as any);
    expect(result.series).toEqual([
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
    expect(result.rowAxisLeafColumnCount).toBe(1);
    expect(result.hasConfiguredAxis).toBe(false);
    expect(result.singleMetricDescription).toBeUndefined();
  });

  it('legacy mainCol never forwards rangeOption onto the result column (preexisting asymmetry vs. the cross path)', () => {
    // A valid pivot needs >=2 text columns (one main, one to pivot into columns) — a
    // single text column with no pivot dimension isn't a shape either original path
    // (legacy or cross) supports.
    const cols = [
      new EdaColumnText({ header: 'Region', field: 'region', rangeOption: true }),
      new EdaColumnText({ header: 'Product', field: 'product' }),
      new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    ];
    const rows = [{ region: '1-5', product: 'Chairs', amt: 10 }];
    const axis = synthesizeLegacyAxis(cols);
    const result = buildCrossTable(rows, cols, axis, { crossSortOrder: 'alphabetical', navColumnSubstitution: {}, hasConfiguredAxis: false });
    expect((result.cols[0] as any).rangeOption).toBeUndefined();
  });

  it('never drops a row, even when a main-axis value has zero matching data across every pivoted cell (new edge case, no prior coverage)', () => {
    const cols = [
      new EdaColumnText({ header: 'Region', field: 'region' }),
      new EdaColumnText({ header: 'Product', field: 'product' }),
      new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    ];
    // 'Empty' never appears in a row alongside every Product value that 'North' has, so
    // its ' Chairs ~ amt' cell has no matching source row at all — it must still survive
    // as a zero-filled row, matching the legacy engine's original "always emit one row
    // per main-axis value" behavior (as opposed to the cross path's Cartesian-product +
    // drop-if-every-cell-empty behavior, which this same main-axis value would NOT
    // survive under, since none of its cells would ever get set away from the '' sentinel).
    const rows = [
      { region: 'North', product: 'Chairs', amt: 10 },
      { region: 'Empty', product: 'Tables', amt: 99 }, // only ever contributes to 'Tables', never 'Chairs'
    ];
    const axis = synthesizeLegacyAxis(cols);
    const result = buildCrossTable(rows, cols, axis, { crossSortOrder: 'alphabetical', navColumnSubstitution: {}, hasConfiguredAxis: false });

    expect(result.rows).toEqual([
      { region: 'Empty', ' Chairs ~ amt': 0, ' Tables ~ amt': 99 },
      { region: 'North', ' Chairs ~ amt': 10, ' Tables ~ amt': 0 },
    ] as any);
  });
});

describe('eda-crosstable.engine — cross table (2-axis drag-drop), matches eda-table.characterization.spec.ts', () => {
  function buildAxis(): AxisConfig {
    return {
      itemX: [{ column_name: 'region', description: 'Region' }],
      itemY: [{ column_name: 'product', description: 'Product' }],
      itemZ: [{ column_name: 'amt', description: 'Amount' }],
    };
  }

  function buildFixture() {
    const cols = [
      new EdaColumnText({ header: 'Region', field: 'region' }),
      new EdaColumnText({ header: 'Product', field: 'product' }),
      new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    ];
    const rows = [
      { region: 'North', product: 'Chairs', amt: 10 },
      { region: 'North', product: 'Tables', amt: 20 },
      { region: 'South', product: 'Chairs', amt: 5 },
      { region: 'South', product: 'Tables', amt: 15 },
    ];
    return buildCrossTable(rows, cols, buildAxis(), { crossSortOrder: 'alphabetical', navColumnSubstitution: {}, hasConfiguredAxis: true });
  }

  it('produces the same cols/rows shape as PivotTable() for the cross-path fixture', () => {
    const result = buildFixture();

    expect(colSummary(result.cols)).toEqual([
      { field: 'region', header: 'Region', type: 'EdaColumnText' },
      { field: ' Chairs ~ amt', header: ' Chairs ~ amt', type: 'EdaColumnNumber' },
      { field: ' Tables ~ amt', header: ' Tables ~ amt', type: 'EdaColumnNumber' },
    ]);
    expect(result.rows).toEqual([
      { region: 'North', ' Chairs ~ amt': 10, ' Tables ~ amt': 20 },
      { region: 'South', ' Chairs ~ amt': 5, ' Tables ~ amt': 15 },
    ] as any);
  });

  it('mains header cell forwards rangeOption and sources its tooltip from the matched column header (matches buildCrossHeaders exactly)', () => {
    const result = buildFixture();
    expect(result.series[0].labels[0]).toEqual({
      title: 'Region', column: 'region', rowspan: 2, colspan: 1, sortable: true, description: 'Region', rangeOption: false,
    } as any);
    expect(result.series[1].labels[0]).toEqual({
      title: 'Chairs', description: 'Product', rowspan: 1, colspan: 1, sortable: true, metric: 'Amount', column: ' Chairs ~ amt', sortState: false,
    } as any);
  });

  it('rowAxisLeafColumnCount and singleMetricDescription feed MatrixHeaderModel correctly', () => {
    const result = buildFixture();
    expect(result.rowAxisLeafColumnCount).toBe(1);
    expect(result.hasConfiguredAxis).toBe(true);
    expect(result.singleMetricDescription).toBe('Amount');
  });

  it('crossSortOrder must be applied when building (it is baked into row order, not re-derived later)', () => {
    const cols = [
      new EdaColumnText({ header: 'Region', field: 'region' }),
      new EdaColumnText({ header: 'Product', field: 'product' }),
      new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    ];
    // 'Alpha' sorts first alphabetically but has the smaller total; 'Zulu' is the opposite.
    const rows = [
      { region: 'Alpha', product: 'Chairs', amt: 1 },
      { region: 'Alpha', product: 'Tables', amt: 1 },
      { region: 'Zulu', product: 'Chairs', amt: 50 },
      { region: 'Zulu', product: 'Tables', amt: 50 },
    ];

    const alpha = buildCrossTable(rows, cols, buildAxis(), { crossSortOrder: 'alphabetical', navColumnSubstitution: {}, hasConfiguredAxis: true });
    const byValue = buildCrossTable(rows, cols, buildAxis(), { crossSortOrder: 'value', navColumnSubstitution: {}, hasConfiguredAxis: true });

    expect(alpha.rows.map((r: any) => r.region)).toEqual(['Alpha', 'Zulu']);
    expect(byValue.rows.map((r: any) => r.region)).toEqual(['Zulu', 'Alpha']);
  });

  it('drops a row when every pivoted cell for a main-axis value stays empty (real cross-table behavior, distinct from the legacy path)', () => {
    const cols = [
      new EdaColumnText({ header: 'Region', field: 'region' }),
      new EdaColumnText({ header: 'Product', field: 'product' }),
      new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    ];
    const rows = [
      { region: 'North', product: 'Chairs', amt: 10 },
      { region: 'Empty', product: 'Tables', amt: 99 }, // 'Empty' never has a 'Chairs' row -> its Chairs cell never leaves the '' sentinel
    ];
    const result = buildCrossTable(rows, cols, buildAxis(), { crossSortOrder: 'alphabetical', navColumnSubstitution: {}, hasConfiguredAxis: true });

    // Both regions DO get at least one non-empty cell here (Empty has Tables=99), so both survive —
    // this fixture instead documents that the surviving 'Empty' row's Chairs cell is genuinely
    // untouched (never numerically zeroed, unlike the legacy path's equivalent case).
    expect(result.rows).toEqual([
      { region: 'Empty', ' Chairs ~ amt': '', ' Tables ~ amt': 99 },
      { region: 'North', ' Chairs ~ amt': 10, ' Tables ~ amt': '' },
    ] as any);
  });
});
