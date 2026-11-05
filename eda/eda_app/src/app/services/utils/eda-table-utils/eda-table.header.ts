/**
 * HeaderModel abstracts the difference between a plain table's flat header (`cols`)
 * and a crosstable's matrix header (`series`, with rowspan/colspan), so
 * eda-table.totals.ts no longer needs to branch on `this.pivot`.
 *
 * Extracted from eda-table.ts's rowTotals()/rowTrend()/deleteRowTotals()/deleteTrend()/
 * colsPercentages()/removePercentages(), verified line-by-line against that source
 * (not just the rough interface sketch from planning) — several non-obvious quirks
 * are preserved deliberately; see the comments on MatrixHeaderModel below.
 */

export interface HeaderLabel {
  title: string;
  rowspan: number;
  colspan: number;
  sortable?: boolean;
  sortState?: boolean;
  column?: string;
  description?: string;
  metric?: string;
  isTotal?: boolean;
  rangeOption?: boolean;
}

export interface HeaderRow {
  labels: HeaderLabel[];
}

export type SyntheticColumnKind = 'total' | 'trend';

export interface SyntheticColumnGroupSpec {
  kind: SyntheticColumnKind;
  /** this.Totals / this.Trend */
  groupTitle: string;
  entries: Array<{ field: string; displayTitle: string }>;
}

export interface HeaderModel {
  readonly isMatrix: boolean;

  /** Replaces `if (this.pivot === true)` inside rowTotals()/rowTrend(). */
  supportsRowAggregates(): boolean;

  /** Leaf/metric-level labels. Flat: derived from `cols`. Matrix: last row of `series`.
   *  Used internally to compute colsPercentages()'s `numericColumns`/metricCount. */
  getLeafLabels(): HeaderLabel[];

  /** "pretyNames" in the original code. `valueKeys` is accepted for interface symmetry
   *  but unused by either implementation today, exactly like the original: pretyNames
   *  is derived from `series`/axis config, never indexed by the value keys themselves
   *  (the caller re-associates pretyNames[i] with valueKeys[i] afterwards). */
  getMetricDisplayNames(valueKeys: string[]): string[];

  /** Mirrors rowTotals()/rowTrend()'s header-side effects. Flat: no-op. Matrix: pushes
   *  the group cell onto series[0] once, and one leaf label per entry onto the last row.
   *  The caller (totals.ts) is responsible for only passing entries that don't already
   *  exist as columns — this method does not re-derive that from `cols` (HeaderModel
   *  has no knowledge of `cols`). */
  addSyntheticColumnGroup(spec: SyntheticColumnGroupSpec): void;

  /** Mirrors deleteRowTotals()/deleteTrend(). `remainingLeafCount` is computed by the
   *  caller from `cols`, exactly as today's `cols.filter(nonPercentage).length - N`,
   *  where N is `getRowAxisLeafColumnCount()` for 'total' or the literal 1 for 'trend'
   *  (deleteTrend() never reads axis config — see getRowAxisLeafColumnCount's doc). */
  removeSyntheticColumnGroup(kind: SyntheticColumnKind, remainingLeafCount: number): void;

  /** `itemX.length` from the axis config: 1 for a legacy synthesized single-axis pivot,
   *  the real axis width for a drag-drop cross table. Needed by deleteRowTotals() to
   *  compute how many leaf columns survive removal — deleteTrend() never needs this (it
   *  always subtracts exactly 1, regardless of axis shape, matching the original).
   *  Flat: unreachable (supportsRowAggregates() is false), returns 1 defensively. */
  getRowAxisLeafColumnCount(): number;

  /** Mirrors the two colsPercentages()/removePercentages() colspan loops. `metricCount`
   *  is only used by 'double' (sizing the isTotal group's new colspan) — pass 0 for
   *  'halve'. Flat: no-op both directions (flat's header is 1:1 with `cols`, no colspan
   *  bookkeeping needed — this is also why the original gates this whole step on
   *  `this.pivot`: for a flat table it is unreachable, and calling this is a no-op here
   *  too, so callers may invoke it unconditionally). */
  scalePercentageColspans(direction: 'double' | 'halve', metricCount: number): void;

  /** Bound to the template's `inject.series`. Flat returns []. */
  getRows(): HeaderRow[];
}

export class FlatHeaderModel implements HeaderModel {
  readonly isMatrix = false;

  constructor(private readonly cols: () => Array<{ header: string; field: string; sortable?: boolean; description?: string }>) {}

  supportsRowAggregates(): boolean {
    return false;
  }

  getLeafLabels(): HeaderLabel[] {
    return this.cols().map(c => ({
      title: c.header,
      rowspan: 1,
      colspan: 1,
      sortable: c.sortable,
      column: c.field,
      description: c.description,
    }));
  }

  getMetricDisplayNames(valueKeys: string[]): string[] {
    // Unreachable in practice (supportsRowAggregates() is false, so rowTotals()/
    // rowTrend() return before calling this) — kept for interface completeness.
    const cols = this.cols();
    return valueKeys.map(k => cols.find(c => c.field === k)?.header ?? k);
  }

  addSyntheticColumnGroup(_spec: SyntheticColumnGroupSpec): void {}
  removeSyntheticColumnGroup(_kind: SyntheticColumnKind, _remainingLeafCount: number): void {}
  scalePercentageColspans(_direction: 'double' | 'halve', _metricCount: number): void {}
  getRowAxisLeafColumnCount(): number { return 1; }

  getRows(): HeaderRow[] {
    return [];
  }
}

export class MatrixHeaderModel implements HeaderModel {
  readonly isMatrix = true;

  /**
   * @param series live reference to the crosstable's `series` array — mutated in place,
   *   exactly like `this.series` was mutated in place by the original methods.
   * @param rowAxisLeafColumnCount `itemX.length` from the axis config (always the
   *   real value, whether synthesized for the legacy 1-axis pivot — where it is
   *   always 1 — or taken from a real drag-drop axis config). The original computed
   *   this differently in `deleteRowTotals()`'s two `ordering[0].axes[0].itemX.length>1`
   *   branches, but since itemX.length is never 0, both branches always evaluate to the
   *   same number as itemX.length itself — the branch was redundant, not semantically
   *   different, so both collapse into this one value uniformly.
   * @param hasConfiguredAxis true for a drag-drop cross table (`ordering[0] !== undefined`
   *   in the original), false for a legacy synthesized-axis pivot. This is NOT
   *   equivalent to `rowAxisLeafColumnCount === 1` — it governs a real, independent
   *   asymmetry in the original `deleteRowTotals()`: only when true does it ALSO clear
   *   series[0]'s isTotal label (besides series[length-2], which it always clears).
   *   For a legacy pivot with more than one pivot dimension (series.length > 2), this
   *   means series[0]'s stale isTotal label is never cleared — a preexisting quirk in
   *   the original code, preserved here rather than silently fixed.
   * @param singleMetricDescription precomputed `itemZ[0].description` when the axis has
   *   exactly one metric AND `hasConfiguredAxis` is true — replaces the original's
   *   unguarded `this.ordering[0].axes[0].itemZ` read (a real crash risk today when
   *   `ordering` is `undefined`), since the engine always knows this safely at
   *   header-build time.
   */
  constructor(
    private readonly series: HeaderRow[],
    private readonly rowAxisLeafColumnCount: number,
    private readonly hasConfiguredAxis: boolean,
    private readonly singleMetricDescription?: string,
  ) {}

  supportsRowAggregates(): boolean {
    return true;
  }

  getLeafLabels(): HeaderLabel[] {
    return this.series[this.series.length - 1]?.labels ?? [];
  }

  getMetricDisplayNames(_valueKeys: string[]): string[] {
    const firstRowLabels = this.series[0].labels;
    if (firstRowLabels.length <= 2) {
      return [firstRowLabels[firstRowLabels.length - 1].title];
    }
    if (this.singleMetricDescription !== undefined) {
      return [this.singleMetricDescription];
    }
    const lastRowLabels = this.series[this.series.length - 1].labels;
    return Array.from(new Set(lastRowLabels.map(l => l.title)));
  }

  addSyntheticColumnGroup(spec: SyntheticColumnGroupSpec): void {
    if (spec.entries.length === 0) return;

    const firstRowLabels = this.series[0].labels;
    if (!firstRowLabels.some(l => l.isTotal)) {
      firstRowLabels.push({
        title: spec.groupTitle,
        rowspan: this.series.length - 1,
        colspan: spec.entries.length,
        isTotal: true,
        description: spec.groupTitle,
      });
    }

    const lastRowLabels = this.series[this.series.length - 1].labels;
    spec.entries.forEach(entry => {
      lastRowLabels.push({
        title: entry.displayTitle,
        rowspan: 2,
        colspan: 1,
        sortable: true,
        column: entry.field,
        description: entry.displayTitle,
      });
    });
  }

  removeSyntheticColumnGroup(kind: SyntheticColumnKind, remainingLeafCount: number): void {
    const n = this.series.length;
    // Always cleared, both kinds — matches deleteRowTotals()/deleteTrend() exactly.
    this.series[n - 2].labels = this.series[n - 2].labels.filter(l => !l.isTotal);
    // Only 'total' + a configured (drag-drop) axis also clears series[0] — see the
    // hasConfiguredAxis doc comment above for why this asymmetry is preserved as-is.
    if (kind === 'total' && this.hasConfiguredAxis) {
      this.series[0].labels = this.series[0].labels.filter(l => !l.isTotal);
    }
    this.series[n - 1].labels = this.series[n - 1].labels.slice(0, remainingLeafCount);
  }

  scalePercentageColspans(direction: 'double' | 'halve', metricCount: number): void {
    if (direction === 'double') {
      this.series.forEach((row, i) => {
        row.labels.forEach(label => {
          if (label.isTotal) {
            label.colspan = metricCount * 2;
          } else if (i !== 0) {
            label.colspan = label.colspan * 2;
          }
          // Independent of the branch above — can stack on top of either one, exactly
          // as in the original (three separate `if`s, not a single if/else chain).
          if (i === 0 && label.rowspan === 1) {
            label.colspan = label.colspan * 2;
          }
        });
      });
    } else {
      this.series.forEach((row, i) => {
        row.labels.forEach((label, j) => {
          if ((i !== 0 || j !== 0) && label.colspan > 1) {
            label.colspan = label.colspan / 2;
          }
        });
      });
    }
  }

  getRowAxisLeafColumnCount(): number {
    return this.rowAxisLeafColumnCount;
  }

  getRows(): HeaderRow[] {
    return this.series;
  }
}
