/// <reference types="jasmine" />
import { FlatHeaderModel, MatrixHeaderModel, HeaderRow } from './eda-table.header';

describe('FlatHeaderModel', () => {
  const cols = [
    { header: 'Category', field: 'cat', sortable: true, description: undefined },
    { header: 'Amount', field: 'amt', sortable: true, description: undefined },
  ];
  const model = new FlatHeaderModel(() => cols);

  it('supportsRowAggregates() is false and every mutator is a no-op', () => {
    expect(model.supportsRowAggregates()).toBe(false);
    expect(() => model.addSyntheticColumnGroup({ kind: 'total', groupTitle: 'x', entries: [{ field: 'a', displayTitle: 'a' }] })).not.toThrow();
    expect(() => model.removeSyntheticColumnGroup('total', 0)).not.toThrow();
    expect(() => model.scalePercentageColspans('double', 1)).not.toThrow();
    expect(model.getRows()).toEqual([]);
  });

  it('getLeafLabels() maps 1:1 from cols', () => {
    expect(model.getLeafLabels()).toEqual([
      { title: 'Category', rowspan: 1, colspan: 1, sortable: true, column: 'cat', description: undefined },
      { title: 'Amount', rowspan: 1, colspan: 1, sortable: true, column: 'amt', description: undefined },
    ]);
  });
});

describe('MatrixHeaderModel — addSyntheticColumnGroup / removeSyntheticColumnGroup', () => {
  // Same shape as the "legacy pivot (1-axis)" characterization fixture:
  // 2 series rows -> series[length-2] === series[0].
  function build2RowSeries(): HeaderRow[] {
    return [
      { labels: [
        { title: 'Region', column: 'region', rowspan: 2, colspan: 1, sortable: true },
        { title: 'Amount', rowspan: 1, colspan: 2 },
      ] },
      { labels: [
        { title: 'Chairs', rowspan: 1, colspan: 1, sortable: true, metric: 'Amount', column: ' Chairs ~ amt', sortState: false },
        { title: 'Tables', rowspan: 1, colspan: 1, sortable: true, metric: 'Amount', column: ' Tables ~ amt', sortState: false },
      ] },
    ];
  }

  it('adds the group cell to series[0] once and one leaf label per entry to the last row', () => {
    const series = build2RowSeries();
    const model = new MatrixHeaderModel(series, 1, false);

    model.addSyntheticColumnGroup({ kind: 'total', groupTitle: 'Totales', entries: [{ field: ' amt', displayTitle: ' amt' }] });

    expect(series[0].labels[2]).toEqual({ title: 'Totales', rowspan: 1, colspan: 1, isTotal: true, description: 'Totales' });
    expect(series[1].labels[2]).toEqual({ title: ' amt', rowspan: 2, colspan: 1, sortable: true, column: ' amt', description: ' amt' });
  });

  it('addSyntheticColumnGroup is idempotent for the group cell if called twice (matches the isTotal guard)', () => {
    const series = build2RowSeries();
    const model = new MatrixHeaderModel(series, 1, false);
    const spec = { kind: 'total' as const, groupTitle: 'Totales', entries: [{ field: ' amt', displayTitle: ' amt' }] };

    model.addSyntheticColumnGroup(spec);
    model.addSyntheticColumnGroup(spec);

    expect(series[0].labels.filter(l => l.isTotal).length).toBe(1);
    // but leaf entries are NOT deduped here — that responsibility belongs to the caller
    // (totals.ts), which is expected to only pass entries that are actually new.
    expect(series[1].labels.length).toBe(4);
  });

  it('a 2-row series always clears series[0] on removal, regardless of hasConfiguredAxis', () => {
    const series = build2RowSeries();
    const model = new MatrixHeaderModel(series, 1, false);
    model.addSyntheticColumnGroup({ kind: 'total', groupTitle: 'Totales', entries: [{ field: ' amt', displayTitle: ' amt' }] });

    model.removeSyntheticColumnGroup('total', 2);

    expect(series[0].labels.some(l => l.isTotal)).toBe(false);
    expect(series[1].labels.length).toBe(2); // truncated back to the original 2 leaf labels
  });

  it('a 3-row series (2 pivot dimensions) only clears series[0] when hasConfiguredAxis is true — preexisting asymmetry preserved from deleteRowTotals()', () => {
    function build3RowSeries(): HeaderRow[] {
      return [
        { labels: [{ title: 'Region', column: 'region', rowspan: 3, colspan: 1, sortable: true }] },
        { labels: [{ title: 'North', rowspan: 1, colspan: 2 }, { title: 'South', rowspan: 1, colspan: 2 }] },
        { labels: [{ title: 'Chairs', rowspan: 1, colspan: 1, sortable: true, column: 'a' }, { title: 'Tables', rowspan: 1, colspan: 1, sortable: true, column: 'b' }] },
      ];
    }

    // hasConfiguredAxis = false (legacy pivot): series[0]'s stale isTotal label survives removal.
    const legacySeries = build3RowSeries();
    const legacyModel = new MatrixHeaderModel(legacySeries, 1, false);
    legacyModel.addSyntheticColumnGroup({ kind: 'total', groupTitle: 'Totales', entries: [{ field: ' amt', displayTitle: ' amt' }] });
    legacyModel.removeSyntheticColumnGroup('total', 2);
    expect(legacySeries[0].labels.some(l => l.isTotal)).toBe(true); // NOT cleared — matches original's gap
    expect(legacySeries[1].labels.some(l => l.isTotal)).toBe(false); // series[length-2] is always cleared

    // hasConfiguredAxis = true (drag-drop cross table): series[0] IS cleared too.
    const crossSeries = build3RowSeries();
    const crossModel = new MatrixHeaderModel(crossSeries, 1, true);
    crossModel.addSyntheticColumnGroup({ kind: 'total', groupTitle: 'Totales', entries: [{ field: ' amt', displayTitle: ' amt' }] });
    crossModel.removeSyntheticColumnGroup('total', 2);
    expect(crossSeries[0].labels.some(l => l.isTotal)).toBe(false);
  });

  it('kind "trend" never clears series[0], even when hasConfiguredAxis is true — matches deleteTrend() exactly', () => {
    const series = build2RowSeries();
    const model = new MatrixHeaderModel(series, 1, true);
    model.addSyntheticColumnGroup({ kind: 'trend', groupTitle: 'Tendencia', entries: [{ field: ' amt', displayTitle: ' amt' }] });

    model.removeSyntheticColumnGroup('trend', 2);

    // series[length-2] (=== series[0] here) is still cleared unconditionally...
    expect(series[0].labels.some(l => l.isTotal)).toBe(false);
  });
});

describe('MatrixHeaderModel — getMetricDisplayNames', () => {
  it('returns the single label title when series[0] has <= 2 labels', () => {
    const series: HeaderRow[] = [
      { labels: [{ title: 'Region', rowspan: 2, colspan: 1 }, { title: 'Amount', rowspan: 1, colspan: 2 }] },
      { labels: [{ title: 'Chairs', rowspan: 1, colspan: 1 }] },
    ];
    const model = new MatrixHeaderModel(series, 1, false);
    expect(model.getMetricDisplayNames([])).toEqual(['Amount']);
  });

  it('uses singleMetricDescription when series[0] has > 2 labels and it is provided', () => {
    const series: HeaderRow[] = [
      { labels: [{ title: 'A', rowspan: 1, colspan: 1 }, { title: 'B', rowspan: 1, colspan: 1 }, { title: 'C', rowspan: 1, colspan: 1 }] },
      { labels: [{ title: 'X', rowspan: 1, colspan: 1 }] },
    ];
    const model = new MatrixHeaderModel(series, 1, true, 'Revenue');
    expect(model.getMetricDisplayNames([])).toEqual(['Revenue']);
  });

  it('falls back to distinct last-row titles when series[0] has > 2 labels and no singleMetricDescription', () => {
    const series: HeaderRow[] = [
      { labels: [{ title: 'A', rowspan: 1, colspan: 1 }, { title: 'B', rowspan: 1, colspan: 1 }, { title: 'C', rowspan: 1, colspan: 1 }] },
      { labels: [{ title: 'Revenue', rowspan: 1, colspan: 1 }, { title: 'Cost', rowspan: 1, colspan: 1 }, { title: 'Revenue', rowspan: 1, colspan: 1 }] },
    ];
    const model = new MatrixHeaderModel(series, 1, false);
    expect(model.getMetricDisplayNames([])).toEqual(['Revenue', 'Cost']);
  });
});

describe('MatrixHeaderModel — scalePercentageColspans', () => {
  it('"double" reproduces the exact colspans captured in eda-table.characterization.spec.ts', () => {
    // Same series shape/colspans as the legacy pivot fixture BEFORE colsPercentages().
    const series: HeaderRow[] = [
      { labels: [
        { title: 'Region', rowspan: 2, colspan: 1 },
        { title: 'Amount', rowspan: 1, colspan: 2 },
      ] },
      { labels: [
        { title: 'Chairs', rowspan: 1, colspan: 1 },
        { title: 'Tables', rowspan: 1, colspan: 1 },
      ] },
    ];
    const model = new MatrixHeaderModel(series, 1, false);
    const metricCount = new Set(model.getLeafLabels().map(l => l.title)).size; // 2

    model.scalePercentageColspans('double', metricCount);

    expect(series.map(s => s.labels.map(l => l.colspan))).toEqual([[1, 4], [2, 2]]);
  });

  it('"halve" undoes "double" back to the original colspans, except series[0].labels[0]', () => {
    const series: HeaderRow[] = [
      { labels: [
        { title: 'Region', rowspan: 2, colspan: 1 },
        { title: 'Amount', rowspan: 1, colspan: 2 },
      ] },
      { labels: [
        { title: 'Chairs', rowspan: 1, colspan: 1 },
        { title: 'Tables', rowspan: 1, colspan: 1 },
      ] },
    ];
    const model = new MatrixHeaderModel(series, 1, false);
    model.scalePercentageColspans('double', 2);
    model.scalePercentageColspans('halve', 0);

    expect(series.map(s => s.labels.map(l => l.colspan))).toEqual([[1, 2], [1, 1]]);
  });

  it('an isTotal group cell in row 0 gets BOTH the metricCount recompute AND the row-0/rowspan===1 doubling stacked (matches the original\'s 3 independent `if`s, not an if/else chain) — and stays non-cumulative across repeated double() calls', () => {
    const series: HeaderRow[] = [
      { labels: [
        { title: 'Region', rowspan: 2, colspan: 1 },
        // rowspan: 1 here matches addSyntheticColumnGroup()'s real output for a 2-row
        // series (rowspan = series.length - 1 = 1), so BOTH checks apply: colspan is
        // first recomputed from metricCount (3*2=6), then independently doubled again
        // because rowspan===1 in row 0 (6*2=12).
        { title: 'Totales', rowspan: 1, colspan: 1, isTotal: true },
      ] },
      { labels: [{ title: 'amt', rowspan: 1, colspan: 1 }] },
    ];
    const model = new MatrixHeaderModel(series, 1, false);

    model.scalePercentageColspans('double', 3);
    expect(series[0].labels[1].colspan).toBe(12);

    // Non-cumulative: halve then double again reproduces the same 12, not 24 — the
    // recompute-from-metricCount step (not a multiply-in-place) is what makes repeated
    // colsPercentages() calls idempotent in the original code.
    model.scalePercentageColspans('halve', 0);
    model.scalePercentageColspans('double', 3);
    expect(series[0].labels[1].colspan).toBe(12);
  });
});
