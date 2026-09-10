/**
 * Crosstable model: composes EdaTableBase with a matrix header, matrix cell-aggregation,
 * and the unified N-axis engine. Consumed by eda-crosstable.component.ts as
 * `EdaCrosstableComponent.inject`.
 */
import { EdaColumn } from '../eda-table/eda-columns/eda-column';
import { EdaTableBase } from '../eda-table-core/eda-table.base';
import { HeaderModel, MatrixHeaderModel } from '@eda/services/utils/eda-table-utils/eda-table.header';
import { CellAggregationStrategy, MatrixCellAggregation } from '@eda/services/utils/eda-table-utils/eda-table.totals';
import { AxisConfig, AxisItem, buildCrossTable, synthesizeLegacyAxis } from './eda-crosstable.engine';

export class EdaCrosstableModel extends EdaTableBase {
  public readonly cellAggregation: CellAggregationStrategy = new MatrixCellAggregation();
  public header: HeaderModel = new MatrixHeaderModel([], 1, false);

  /** Drag-drop axis config from the 3-box UI; `undefined`/`[]` means "use the legacy
   *  single-axis auto-pivot" (see synthesizeLegacyAxis()). */
  public ordering: any[];
  /** 'alphabetical' | 'value' (desc) | 'valueAsc' (asc). */
  public crossSortOrder: string = 'alphabetical';

  /** Bound to the template's `*ngFor="let serie of inject.series"` matrix header row. */
  public get series() {
    return this.header.getRows();
  }

  /**
   * The ORIGINAL query columns, captured once at construction and never mutated
   * afterward. The old EdaTable had to save/restore `this.cols` across pivot rebuilds
   * (`oldcols`) because PivotTable() replaced `this.cols` in place with the previous
   * rebuild's pivoted result, corrupting the field names later rebuilds needed to match
   * against. buildCrossTable() is a pure function that takes the source columns as an
   * explicit argument instead, so there is nothing to save/restore — this field IS the
   * thing that used to need restoring, kept separate from the mutable `this.cols`.
   */
  private readonly sourceCols: EdaColumn[];

  public constructor(init: Partial<EdaCrosstableModel>) {
    super(init);
    // Guard for configs saved before crossSortOrder existed (explicitly `undefined`
    // after Object.assign, not merely absent — see the original's identical guard).
    if (!this.crossSortOrder) this.crossSortOrder = 'alphabetical';
    this.sourceCols = [...this.cols];
  }

  protected onValueAssigned(): void {
    const hasConfiguredAxis = this.ordering != undefined && this.ordering.length !== 0;
    const axis: AxisConfig = hasConfiguredAxis
      ? this.filterConfiguredAxis(this.ordering[0].axes[0])
      : synthesizeLegacyAxis(this.sourceCols);

    const result = buildCrossTable(this._value, this.sourceCols, axis, {
      crossSortOrder: this.crossSortOrder as 'alphabetical' | 'value' | 'valueAsc',
      navColumnSubstitution: this.navColumnSubstitution,
      hasConfiguredAxis,
    });

    this._value = result.rows;
    this.cols = result.cols;
    this.header = new MatrixHeaderModel(result.series, result.rowAxisLeafColumnCount, result.hasConfiguredAxis, result.singleMetricDescription);
  }

  /**
   * Mirrors PivotTable()'s exclusion of axis items whose effective column no longer
   * exists in the source columns (e.g. nav-children excluded from the effective fields
   * of the query) — matched against `sourceCols`, not the (possibly already-pivoted)
   * `this.cols`, for the same reason the constructor snapshots `sourceCols` at all.
   * itemZ is deliberately left unfiltered, matching the original exactly.
   */
  private filterConfiguredAxis(rawAxis: { itemX: AxisItem[]; itemY: AxisItem[]; itemZ: AxisItem[] }): AxisConfig {
    const navSub = this.navColumnSubstitution || {};
    const effectiveXNames = new Set<string>();
    const filteredItemX = rawAxis.itemX.filter(x => {
      const eff = navSub[x.column_name] || x.column_name;
      if (this.sourceCols.some(c => c.field === eff)) {
        effectiveXNames.add(eff);
        return true;
      }
      return false;
    });
    const filteredItemY = rawAxis.itemY.filter(y => {
      const eff = navSub[y.column_name] || y.column_name;
      return this.sourceCols.some(c => c.field === eff) && !effectiveXNames.has(eff);
    });
    return { itemX: filteredItemX, itemY: filteredItemY, itemZ: rawAxis.itemZ };
  }
}
