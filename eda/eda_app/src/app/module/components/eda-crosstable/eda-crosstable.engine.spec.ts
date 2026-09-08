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

describe('eda-crosstable.engine — sparse itemY (2+ dimensions), no prior coverage', () => {
  // category values found anywhere: A, B (alphabetical rank A=0, B=1).
  // size values found anywhere: M, S (alphabetical rank M=0, S=1).
  // Dense cross product would be 4 columns (A~M, A~S, B~M, B~S); (B, M) never co-occurs in
  // any row, so the sparse engine must omit it entirely rather than emit an always-empty column.
  function buildFixture() {
    const cols = [
      new EdaColumnText({ header: 'Region', field: 'region' }),
      new EdaColumnText({ header: 'Category', field: 'category' }),
      new EdaColumnText({ header: 'Size', field: 'size' }),
      new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    ];
    const rows = [
      { region: 'North', category: 'A', size: 'S', amt: 10 },
      { region: 'North', category: 'A', size: 'M', amt: 20 },
      { region: 'North', category: 'B', size: 'S', amt: 5 },
      { region: 'South', category: 'A', size: 'S', amt: 1 },
    ];
    const axis: AxisConfig = {
      itemX: [{ column_name: 'region', description: 'Region' }],
      itemY: [{ column_name: 'category', description: 'Category' }, { column_name: 'size', description: 'Size' }],
      itemZ: [{ column_name: 'amt', description: 'Amount' }],
    };
    return buildCrossTable(rows, cols, axis, { crossSortOrder: 'alphabetical', navColumnSubstitution: {}, hasConfiguredAxis: true });
  }

  it('emits one column per co-occurring (category, size) pair actually present in the data, not the full cross product', () => {
    const result = buildFixture();

    // Only 3 columns, not 4 — (B, M) is excluded because it never occurs in any row.
    expect(colSummary(result.cols)).toEqual([
      { field: 'region', header: 'Region', type: 'EdaColumnText' },
      { field: ' A ~ M ~ amt', header: ' A ~ M ~ amt', type: 'EdaColumnNumber' },
      { field: ' A ~ S ~ amt', header: ' A ~ S ~ amt', type: 'EdaColumnNumber' },
      { field: ' B ~ S ~ amt', header: ' B ~ S ~ amt', type: 'EdaColumnNumber' },
    ]);
  });

  it('every row gets the same (sparse) column set, sentinel-filled where that row has no data for a column that occurs elsewhere', () => {
    const result = buildFixture();

    expect(result.rows).toEqual([
      { region: 'North', ' A ~ M ~ amt': 20, ' A ~ S ~ amt': 10, ' B ~ S ~ amt': 5 },
      // South only ever has (category=A, size=S) — its other two (sparse, but still
      // globally-shared) columns stay the '' sentinel, same semantics as the 1-dimension case.
      { region: 'South', ' A ~ M ~ amt': '', ' A ~ S ~ amt': 1, ' B ~ S ~ amt': '' },
    ] as any);
  });

  it('groups the header rows by run-length on each Y-dimension, matching the sparse column set', () => {
    const result = buildFixture();

    // dim 0 (category): 'A' spans its 2 surviving sub-columns (A~M, A~S), 'B' spans its 1 (B~S).
    expect(result.series[1].labels.map((l: any) => ({ title: l.title, colspan: l.colspan }))).toEqual([
      { title: 'A', colspan: 2 },
      { title: 'B', colspan: 1 },
    ]);
    // dim 1 (size): one cell per surviving column, in the same order as the columns.
    expect(result.series[2].labels.map((l: any) => ({ title: l.title, colspan: l.colspan }))).toEqual([
      { title: 'M', colspan: 1 },
      { title: 'S', colspan: 1 },
      { title: 'S', colspan: 1 },
    ]);
  });

  it('stays bounded by the number of distinct co-occurring row combinations, not by the product of each Y-dimension\'s cardinality (the actual bottleneck this fixes)', () => {
    const cols = [
      new EdaColumnText({ header: 'Region', field: 'region' }),
      new EdaColumnText({ header: 'Name', field: 'name' }),
      new EdaColumnText({ header: 'Subject', field: 'subject' }),
      new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    ];
    // 300 rows, each with a UNIQUE (name, subject) pair — 300 distinct values on each of two
    // Y-dimensions. A dense cross product would be 300*300 = 90,000 synthetic columns; the
    // sparse engine must produce at most 300 (one per row that actually occurred).
    const rows = Array.from({ length: 300 }, (_, i) => ({
      region: 'North',
      name: `Name ${i}`,
      subject: `Subject ${i}`,
      amt: i,
    }));
    const axis: AxisConfig = {
      itemX: [{ column_name: 'region', description: 'Region' }],
      itemY: [{ column_name: 'name', description: 'Name' }, { column_name: 'subject', description: 'Subject' }],
      itemZ: [{ column_name: 'amt', description: 'Amount' }],
    };

    const result = buildCrossTable(rows, cols, axis, { crossSortOrder: 'alphabetical', navColumnSubstitution: {}, hasConfiguredAxis: true });

    // region column + exactly 300 metric columns (one per occurring pair) — never 90,000.
    expect(result.cols.length).toBe(301);
  });

  it('does not collide two different Y-tuples that would concatenate to the same string under a naive join (regression: an empty TUPLE_SEP let ["AB","C"] and ["A","BC"] both hash to "ABC")', () => {
    const cols = [
      new EdaColumnText({ header: 'Region', field: 'region' }),
      new EdaColumnText({ header: 'Part1', field: 'part1' }),
      new EdaColumnText({ header: 'Part2', field: 'part2' }),
      new EdaColumnNumber({ header: 'Amount', field: 'amt' }),
    ];
    const rows = [
      { region: 'R', part1: 'AB', part2: 'C', amt: 10 },
      { region: 'R', part1: 'A', part2: 'BC', amt: 20 },
    ];
    const axis: AxisConfig = {
      itemX: [{ column_name: 'region', description: 'Region' }],
      itemY: [{ column_name: 'part1', description: 'Part1' }, { column_name: 'part2', description: 'Part2' }],
      itemZ: [{ column_name: 'amt', description: 'Amount' }],
    };

    const result = buildCrossTable(rows, cols, axis, { crossSortOrder: 'alphabetical', navColumnSubstitution: {}, hasConfiguredAxis: true });

    // Two genuinely distinct tuples must survive as two distinct columns with their own
    // untouched values — under the empty-separator bug they collapse into a single column
    // (dedupe treats "AB"+"C" and "A"+"BC" as the same key) with a corrupted summed value.
    expect(colSummary(result.cols)).toEqual([
      { field: 'region', header: 'Region', type: 'EdaColumnText' },
      { field: ' A ~ BC ~ amt', header: ' A ~ BC ~ amt', type: 'EdaColumnNumber' },
      { field: ' AB ~ C ~ amt', header: ' AB ~ C ~ amt', type: 'EdaColumnNumber' },
    ]);
    expect(result.rows).toEqual([
      { region: 'R', ' A ~ BC ~ amt': 20, ' AB ~ C ~ amt': 10 },
    ] as any);
  });

  it('never mixes up two Y-dimensions with each other, even when both have long/verbose real-world-like text values (regression for the header-duplication symptom)', () => {
    const cols = [
      new EdaColumnText({ header: 'Estado', field: 'estado' }),
      new EdaColumnText({ header: 'Nombre', field: 'nombre' }),
      new EdaColumnText({ header: 'Asunto', field: 'asunto' }),
      new EdaColumnNumber({ header: 'Importe', field: 'importe' }),
    ];
    const rows = [
      { estado: 'Sí', nombre: 'Montserrat Garriga i Montaner - Club de lectura | 14/01/2025 17:00h', asunto: 'MOTIVO DISTINTO A', importe: 40 },
      { estado: 'Sí', nombre: 'Montserrat Garriga i Montaner - Club de lectura | 17/12/2024 17:00h', asunto: 'MOTIVO DISTINTO B', importe: 40 },
    ];
    const axis: AxisConfig = {
      itemX: [{ column_name: 'estado', description: 'Estado' }],
      itemY: [{ column_name: 'nombre', description: 'Nombre' }, { column_name: 'asunto', description: 'Asunto' }],
      itemZ: [{ column_name: 'importe', description: 'Importe' }],
    };

    const result = buildCrossTable(rows, cols, axis, { crossSortOrder: 'alphabetical', navColumnSubstitution: {}, hasConfiguredAxis: true });

    expect(result.series[1].labels.map((l: any) => l.title)).toEqual([
      'Montserrat Garriga i Montaner - Club de lectura | 14/01/2025 17:00h',
      'Montserrat Garriga i Montaner - Club de lectura | 17/12/2024 17:00h',
    ]);
    expect(result.series[2].labels.map((l: any) => l.title)).toEqual(['MOTIVO DISTINTO A', 'MOTIVO DISTINTO B']);
  });
});
