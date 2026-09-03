/**
 * Plain-table model: composes EdaTableBase with a flat header and flat cell-aggregation.
 * Consumed by eda-table.component.ts as `EdaTableComponent.inject`.
 */
import { EdaTableBase } from '../eda-table-core/eda-table.base';
import { FlatHeaderModel, HeaderModel } from '../eda-table-core/eda-table.header';
import { FlatCellAggregation, CellAggregationStrategy, noRepeatedRows } from '../eda-table-core/eda-table.totals';

export class EdaTableModel extends EdaTableBase {
  public readonly header: HeaderModel;
  public readonly cellAggregation: CellAggregationStrategy;

  public constructor(init: Partial<EdaTableModel>) {
    super(init);
    this.header = new FlatHeaderModel(() => this.cols);
    this.cellAggregation = new FlatCellAggregation();
  }

  /**
   * noRepeatedRows() is plain-table-only behavior in the original (checkTotals() only
   * called it `if (!this.pivot)`) — EdaCrosstableModel's dispatcher simply omits it,
   * rather than giving HeaderModel a capability flag for a single caller.
   */
  public checkTotals(event: { first: number; rows: number } | null) {
    super.checkTotals(event);
    noRepeatedRows(this, this.origValues, {
      noRepetitions: this.noRepetitions,
      resultAsPecentage: this.resultAsPecentage,
      onlyPercentages: this.onlyPercentages,
    });
  }
}
