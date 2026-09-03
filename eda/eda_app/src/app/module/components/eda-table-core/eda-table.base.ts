/**
 * Shared state + orchestration extracted from eda-table.ts's EdaTable class: value/cols
 * plumbing, sorting, context menu, child-navigation, and the checkTotals() dispatcher
 * (now calling into the free functions in eda-table.totals.ts instead of methods that
 * branched on `this.pivot`).
 *
 * `EdaTableModel` and `EdaCrosstableModel` both extend this — NOT each other (composition
 * over inheritance was about avoiding one concrete table type depending on the other; a
 * shared abstract ancestor with a single, well-named customization point is a different,
 * safer shape, and keeps `inject.value`/`inject.cols`/etc. flat for the templates instead
 * of needing `inject.base.value`).
 *
 * `header`/`cellAggregation` are provided by the subclass (the Flat-/Matrix- prefixed
 * pairs from eda-table.header.ts / eda-table.totals.ts). `onValueAssigned()` is the ONE override
 * point: a no-op here (plain table), overridden by EdaCrosstableModel to rebuild
 * rows/cols/header via eda-crosstable.engine.ts after every new `.value` assignment.
 *
 * Dropped vs. the original EdaTable: `pivot` (replaced by having two classes),
 * `oldvalue`/`oldcols` (the pivot-columns-restore dance only existed because the old
 * PivotTable() mutated `this.cols` in place; the new engine is a pure function taking the
 * original query columns as an argument, so there is nothing to restore), `headerGroup`
 * and `getColsInfo()` (verified dead — grepped the whole src tree, nothing outside
 * eda-table.ts itself ever read them).
 */
import { Observable } from 'rxjs';
import { EventEmitter } from '@angular/core';
import * as _ from 'lodash';
import { EdaColumn } from '../eda-table/eda-columns/eda-column';
import { EdaContextMenu } from '@eda/shared/components/eda-context-menu/eda-context-menu';
import { AlertService } from '@eda/services/service.index';
import { LinkedDashboardProps } from '@eda/components/eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
import { HeaderModel } from './eda-table.header';
import {
  TotalsContext,
  CellAggregationStrategy,
  rowTotals,
  rowTrend,
  deleteRowTotals,
  deleteTrend,
  coltotals,
  colSubTotals,
  colsPercentages,
  removePercentages,
} from './eda-table.totals';

export abstract class EdaTableBase implements TotalsContext {
  public onNotify: EventEmitter<any> = new EventEmitter();
  public onSortPivotEvent: EventEmitter<any> = new EventEmitter();
  public onSortColEvent: EventEmitter<any> = new EventEmitter();
  public onNavIn: EventEmitter<{ field: string; value: any }> = new EventEmitter();
  public onNavOut: EventEmitter<{ rootKey: string }> = new EventEmitter();

  public parentFields: string[] = [];
  public childFieldMap: { [columnName: string]: string } = {};
  public navColumnSubstitution: { [originalName: string]: string } = {};

  public _value: any[] = [];
  public cols: EdaColumn[] = [];
  public rows: number = 10;
  public initRows: number = 10;
  public search: boolean = false;
  public loading: boolean = false;
  public alertService: AlertService;
  public filteredValue: any[] | undefined;
  public linkedDashboardProps: LinkedDashboardProps;

  public contextMenu: EdaContextMenu = new EdaContextMenu({});
  public contextMenuRow: any;

  private lastFunctLoad: Observable<any>;

  public partialTotalsRow: Array<any> = [];
  public totalsRow: Array<any> = [];
  public withColTotals: boolean = false;
  public withRowTotals: boolean = false;
  public withTrend: boolean = false;
  public withColSubTotals: boolean = false;
  public resultAsPecentage: boolean = false;
  public onlyPercentages: boolean = false;
  public percentageColumns: EdaColumn[] = [];
  public noRepetitions: boolean;
  public negativeNumbers: boolean;
  public origValues: any[] = [];

  public autolayout: boolean = true;
  public sortedSerie: any = null;
  public sortedColumn: any = { field: null, order: null };

  /** Raw color-style CONFIG (input), e.g. `[{col:'amt', max, min}]` — distinct from the
   *  component's own `styles` field (computed ColorEntry map, see eda-table.color.ts). */
  public styles: any[];

  public headerColor: string = '';
  public bandingColor: string = '';
  public colorEnabled: boolean = true;

  public readonly totalsLabel: string = $localize`:@@addTotals:Totales`;
  public readonly subTotalsLabel: string = $localize`:@@SubTotals:SubTotales`;
  public readonly trendLabel: string = $localize`:@@addtrend:Tendencia`;

  // Not readonly: EdaCrosstableModel replaces it with a fresh MatrixHeaderModel on every
  // rebuild (EdaTableModel's FlatHeaderModel never needs replacing — it reads `this.cols`
  // live via a closure — so it just never reassigns this).
  public abstract header: HeaderModel;
  public abstract readonly cellAggregation: CellAggregationStrategy;

  public constructor(init: Partial<EdaTableBase>) {
    Object.assign(this, init);
    this.initRows = (init as any)['visibleRows'] || this.initRows || 10;
    if (!this.sortedColumn) this.sortedColumn = { field: null, order: null };
  }

  get value(): any[] {
    return this._value;
  }

  set value(values: any[]) {
    if (this.origValues.length === 0) {
      this.origValues = _.cloneDeep(values);
    }
    this.clear();
    this._value = values;
    if (!_.isEmpty(this.value)) {
      _.forEach(this.cols, (c: any) => {
        if (!_.isNil(c.filter)) {
          c.filter.init(_.orderBy(_.uniq(_.map(this.value, c.field))));
        }
      });
    }
    this.onValueAssigned();
    if (this.sortedSerie) {
      this.loadSort();
    }
  }

  /**
   * Rebuild hook, run after every `.value` assignment (after filters are initialized
   * against the raw incoming data, matching the original's exact ordering). No-op here;
   * EdaCrosstableModel overrides it to rebuild rows/cols/header via buildCrossTable().
   */
  protected onValueAssigned(): void {}

  public clear() {
    this._value = [];
  }

  public onPage(event: { first: number; rows: number }): void {
    this.rows = event.rows;
    this.initRows = event.rows;
    this.onNotify.emit(this.rows);
    this.checkTotals(event);
  }

  public load(funct: Observable<any>) {
    this.clear();
    this.loading = true;
    this.lastFunctLoad = funct;
    return new Promise((resolve, reject) => {
      funct.subscribe(
        response => {
          this.value = response;
          this.loading = false;
          resolve(null);
        },
        err => {
          this.loading = false;
          if (!_.isNil(this.alertService)) {
            this.alertService.addError(err);
          }
          reject(err);
        },
      );
    });
  }

  public reload() {
    return this.load(this.lastFunctLoad);
  }

  public getFilteredValues() {
    return this.filteredValue ? this.filteredValue : this.value;
  }

  public getValues() {
    return this.value;
  }

  public _showContextMenu(row: any) {
    this.contextMenu.showContextMenu();
    this.contextMenuRow = row;
  }

  public _hideContexMenu() {
    this.contextMenu.hideContextMenu();
    this.contextMenuRow = undefined;
  }

  public getContextMenuRow() {
    return this.contextMenuRow;
  }

  // --- TotalsContext ---
  getRows() {
    return this._value;
  }
  replaceRows(rows: any[]) {
    // Goes through the full `value` setter (filter re-init), matching the original's
    // `this.value = output` inside noRepeatedRows() exactly — not a raw `_value` write.
    this.value = rows;
  }
  getCols() {
    return this.cols;
  }
  setCols(cols: EdaColumn[]) {
    this.cols = cols;
  }

  public checkTotals(event: { first: number; rows: number } | null) {
    if (this.withRowTotals) {
      rowTotals(this);
    } else if (!this.withTrend) {
      deleteRowTotals(this);
    }

    if (this.withTrend) {
      rowTrend(this);
    } else if (!this.withRowTotals) {
      deleteTrend(this);
    }

    const percentageColumnsRef = { value: this.percentageColumns };
    if (this.resultAsPecentage === true) {
      colsPercentages(this, percentageColumnsRef, this.onlyPercentages);
    } else if (this.resultAsPecentage === false && this.percentageColumns.length !== 0) {
      removePercentages(this, percentageColumnsRef);
    }
    this.percentageColumns = percentageColumnsRef.value;

    if (this.withColTotals) {
      this.totalsRow = coltotals(this);
    }
    if (this.withColSubTotals) {
      this.partialTotalsRow = colSubTotals(this, event ? event.first / event.rows + 1 : 1);
    }
  }

  public onHeaderClick(serie: any) {
    serie.sortState = !serie.sortState;
    this.sort(serie);
    this.sortedSerie = serie;
    this.onSortPivotEvent.emit(this.sortedSerie);
    this.checkTotals(null);
  }

  public loadSort() {
    this.checkTotals(null);
    const serie = this.sortedSerie;
    this.sort(serie);
  }

  public onSort($event: any) {
    if (this.cols.find(col => col.field === $event.field).sortable) {
      this.sortedColumn = $event;
      this.onSortColEvent.emit($event);
      this.checkTotals(null);
    }
  }

  public sort(serie: any) {
    if (typeof this._value[0][serie.column] === 'string') {
      this._value = this._value.sort((a, b) => {
        if (serie.rangeOption) {
          const n1 = this.extractNumberFromRange(a[serie.column]);
          const n2 = this.extractNumberFromRange(b[serie.column]);
          return serie.sortState === true ? n1 - n2 : n2 - n1;
        }
        if (serie.sortState === true) {
          if (a[serie.column] < b[serie.column]) return -1;
          if (a[serie.column] > b[serie.column]) return 1;
          return 0;
        } else {
          if (a[serie.column] > b[serie.column]) return -1;
          if (a[serie.column] < b[serie.column]) return 1;
          return 0;
        }
      });
    } else {
      this._value = this._value.sort((a, b) => {
        if (serie.sortState === true) {
          return a[serie.column] - b[serie.column];
        } else {
          return b[serie.column] - a[serie.column];
        }
      });
    }
  }

  public extractNumberFromRange(input: string): number {
    const regex = /(?:<|<=|>|>=)?\s*(-?\d+)\s*(?:-|<|<=|>|>=)?\s*(-?\d+)?/;
    const match = input?.trim().match(regex);
    if (!match) return 0;
    if (input.includes('<') || input.includes('>')) {
      return parseInt(match[1], 10);
    }
    return match[2] ? parseInt(match[2], 10) : parseInt(match[1], 10);
  }
}
