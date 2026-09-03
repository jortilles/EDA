/**
 * Totals/subtotals/trend/percentage logic extracted from eda-table.ts, rewritten
 * against HeaderModel (eda-table.header.ts) instead of branching on `this.pivot`.
 *
 * Verified line-by-line against the original rowTotals()/rowTrend()/deleteRowTotals()/
 * deleteTrend()/coltotals()/colSubTotals()/colsPercentages()/removePercentages()/
 * noRepeatedRows(). A few pieces don't fit HeaderModel (a header/layout concern) because
 * they are genuinely about DATA, not layout — the percentage-cell math in coltotals()/
 * colSubTotals(), and one non-numeric-column subtotal cell. Those go through the
 * separate CellAggregationStrategy, confirmed with the user during planning.
 */
import * as _ from 'lodash';
import { EdaColumn } from '../eda-table/eda-columns/eda-column';
import { EdaColumnNumber } from '../eda-table/eda-columns/eda-column-number';
import { EdaColumnChart } from '../eda-table/eda-columns/eda-column-chart';
import { EdaColumnPercentage } from '../eda-table/eda-columns/eda-column-percentage';
import { EdaLineD3 } from '../eda-line-d3/eda-line';
import { HeaderModel, SyntheticColumnKind } from './eda-table.header';

export interface CellAggregationStrategy {
  /**
   * coltotals()'s percentage-column value: this metric's share of the grand-total row.
   * Flat is hard-coded '100.00%' in the original — it never computes a ratio here (unlike
   * percentageOfPageTotal), so a same-mode all-zero column still yields '100.00%', not ' ~ '.
   */
  percentageOfGrandTotal(grandTotalRow: any, percentageCol: EdaColumn): string;
  /** colSubTotals()'s percentage-column value: this page's share of the full dataset. */
  percentageOfPageTotal(pageTotalRow: any, percentageCol: EdaColumn, allRows: any[]): string;
  /**
   * colSubTotals()'s cell for a non-numeric, non-percentage column that isn't the first
   * one (e.g. a trend sparkline column, which can't render a chart in a totals row).
   * Flat: null (caller renders a blank cell, matching the original's plain `else`).
   * Matrix: the metric's percentage of the sibling '~' total on the page-total row.
   */
  nonNumericSubtotalCell(col: EdaColumn, pageTotalRow: any): { data: string; classSuffix: string } | null;
}

export interface TotalsContext {
  getRows(): any[];
  /**
   * Re-assigns the displayed rows AND reinitializes column filters against the new
   * data — mirrors the original's `this.value = output` inside noRepeatedRows(), which
   * goes through the full `value` setter (filter re-init), not a raw `_value` write.
   * Every other function here mutates the rows returned by getRows() in place instead.
   */
  replaceRows(rows: any[]): void;
  getCols(): EdaColumn[];
  setCols(cols: EdaColumn[]): void;
  header: HeaderModel;
  cellAggregation: CellAggregationStrategy;
  initRows: number;
  totalsLabel: string;
  subTotalsLabel: string;
  trendLabel: string;
}

export interface TotalRowCell {
  data: string;
  style?: string;
  class: string;
  border: string;
  type: string;
}

// ---------------------------------------------------------------------------
// rowTotals / rowTrend / deleteRowTotals / deleteTrend
// ---------------------------------------------------------------------------

function deriveValueKeysAndNames(ctx: TotalsContext) {
  const cols = ctx.getCols();
  const rows = ctx.getRows();
  const colNames = cols.map(col => col.field);
  const numericCols = cols.filter(col => col.type === 'EdaColumnNumber').map(c => c.field);

  const keys = Object.keys(rows[0])
    .filter(key => numericCols.includes(key))
    .map(key => key.slice(key.lastIndexOf('~') + 1));
  const valuesKeys = Array.from(new Set(keys));

  const pretyNames = ctx.header.getMetricDisplayNames(valuesKeys);

  return { colNames, numericCols, valuesKeys, pretyNames };
}

function addSyntheticColumns(
  ctx: TotalsContext,
  kind: SyntheticColumnKind,
  groupTitle: string,
  colNames: string[],
  valuesKeys: string[],
  pretyNames: string[],
  makeColumn: (valueKey: string) => EdaColumn,
): void {
  const newValueKeys = valuesKeys.filter(vk => !colNames.includes(vk));
  if (newValueKeys.length === 0) return;

  const cols = ctx.getCols();
  newValueKeys.forEach(valueKey => cols.push(makeColumn(valueKey)));

  ctx.header.addSyntheticColumnGroup({
    kind,
    groupTitle,
    entries: newValueKeys.map(vk => ({ field: vk, displayTitle: pretyNames[valuesKeys.indexOf(vk)] })),
  });
}

export function rowTotals(ctx: TotalsContext): void {
  if (!ctx.header.supportsRowAggregates()) return;

  const { colNames, numericCols, valuesKeys } = deriveValueKeysAndNames(ctx);
  const pretyNames = ctx.header.getMetricDisplayNames(valuesKeys);

  addSyntheticColumns(ctx, 'total', ctx.totalsLabel, colNames, valuesKeys, pretyNames, valueKey => {
    const col = new EdaColumnNumber({ header: valueKey, field: valueKey });
    col.styleClass = 'total-col';
    col.rowTotal = true;
    return col;
  });

  ctx.getRows().forEach(row => {
    const totals: Record<string, number> = {};
    valuesKeys.forEach(key => {
      totals[key] = 0;
      row[key] = 0;
    });

    numericCols.forEach(key => {
      valuesKeys.forEach(valueKey => {
        const keyArray = key.split('~');
        if (keyArray.includes(valueKey)) {
          let decimalplaces = new EdaColumnNumber({}).decimals;
          try {
            if (row[key].toString().split('.')[1].length > 0) {
              decimalplaces = row[key].toString().split('.')[1].length;
            }
          } catch (e) { /* not a decimal string — keep the default */ }

          if (row[key] === '') {
            totals[valueKey] = parseFloat((totals[valueKey] + 0).toFixed(decimalplaces));
          } else {
            totals[valueKey] = parseFloat((totals[valueKey] + parseFloat(row[key])).toFixed(decimalplaces));
          }
        }
      });
    });

    Object.entries(totals).forEach(([key, value]) => {
      row[key] = value;
    });
  });
}

export function rowTrend(ctx: TotalsContext): void {
  if (!ctx.header.supportsRowAggregates()) return;

  const { colNames, numericCols, valuesKeys } = deriveValueKeysAndNames(ctx);
  const pretyNames = ctx.header.getMetricDisplayNames(valuesKeys);

  addSyntheticColumns(ctx, 'trend', ctx.trendLabel, colNames, valuesKeys, pretyNames, valueKey => {
    const col = new EdaColumnChart({ header: valueKey, field: valueKey });
    col.styleClass = 'trend-col';
    col.rowTotal = true;
    col.width = 100;
    return col;
  });

  ctx.getRows().forEach(row => {
    const totals: Record<string, any[]> = {};
    valuesKeys.forEach(key => {
      totals[key] = [];
      row[key] = [];
    });
    numericCols.forEach(key => {
      valuesKeys.forEach(valueKey => {
        if (key.includes(valueKey)) {
          totals[valueKey].push(row[key]);
        }
      });
    });
    Object.entries(totals).forEach(([field, data]) => {
      const sparkline = new EdaLineD3();
      sparkline.id = `sparkline_${_.uniqueId()}`;
      sparkline.chartType = 'line';
      sparkline.edaChart = 'line';
      sparkline.chartLabels = new Array(data.length).fill('');
      sparkline.chartDataset = [{ label: '', data }];
      sparkline.assignedColors = [{ value: '', color: '#4bc0c0' }];
      sparkline.chartLegend = false;
      sparkline.showGridLines = false;
      sparkline.showPointLines = false;
      sparkline.compact = true;
      row[field] = sparkline;
    });
  });
}

function nonPercentageColumnCount(cols: EdaColumn[]): number {
  return cols.filter(c => c.type !== 'EdaColumnPercentage').length;
}

export function deleteRowTotals(ctx: TotalsContext): void {
  if (!ctx.header.supportsRowAggregates()) return;
  const withTotalCols = ctx.getCols().some(col => col.rowTotal === true);
  if (!withTotalCols) return;

  ctx.setCols(ctx.getCols().filter(col => col.rowTotal !== true));
  const remainingLeafCount = nonPercentageColumnCount(ctx.getCols()) - ctx.header.getRowAxisLeafColumnCount();
  ctx.header.removeSyntheticColumnGroup('total', remainingLeafCount);
}

export function deleteTrend(ctx: TotalsContext): void {
  if (!ctx.header.supportsRowAggregates()) return;

  ctx.setCols(ctx.getCols().filter(col => col.rowTotal !== true));
  const remainingLeafCount = nonPercentageColumnCount(ctx.getCols()) - 1;
  ctx.header.removeSyntheticColumnGroup('trend', remainingLeafCount);
}

// ---------------------------------------------------------------------------
// coltotals / colSubTotals
// ---------------------------------------------------------------------------

function buildTotalRow(ctx: TotalsContext): any {
  const row: any = {};
  const keys = Object.keys(ctx.getRows()[0]);
  keys.forEach(key => { row[key] = 0; });
  return row;
}

function sumPartialRows(ctx: TotalsContext, offset: number): any {
  const row = buildTotalRow(ctx);
  const rows = ctx.getRows();
  const cols = ctx.getCols();
  const keys = cols.map(c => c.field);
  const lastValue = ctx.initRows + offset;

  for (let i = offset; i < lastValue; i++) {
    for (let j = 0; j < keys.length; j++) {
      const currentCol = cols.find(c => c.field === keys[j]);
      if (i < rows.length && currentCol?.type === 'EdaColumnNumber') {
        row[keys[j]] = row[keys[j]] + (rows[i][keys[j]] === '' ? 0 : parseFloat(rows[i][keys[j]]));
      }
    }
  }
  return row;
}

export function coltotals(ctx: TotalsContext): TotalRowCell[] {
  const row = buildTotalRow(ctx);
  const rows = ctx.getRows();
  const cols = ctx.getCols();
  const keys = cols.map(col => col.field);

  for (let i = 0; i < rows.length; i++) {
    for (let j = 0; j < keys.length; j++) {
      const currentCol = cols.find(col => col.field === keys[j]);
      if (currentCol?.type === 'EdaColumnNumber') {
        const decimalplaces = (currentCol as EdaColumnNumber).decimals ?? 0;
        const addend = rows[i][keys[j]] === '' ? 0 : parseFloat(rows[i][keys[j]]);
        row[keys[j]] = parseFloat((parseFloat(row[keys[j]]) + addend).toFixed(decimalplaces));
      } else {
        row[keys[j]] = NaN;
      }
    }
  }

  const totalsRow: TotalRowCell[] = [];
  let firstNonNumericRow = true;
  cols.forEach(col => {
    if (col.type === 'EdaColumnNumber') {
      totalsRow.push({ data: parseFloat(row[col.field]).toLocaleString('de-DE'), style: 'right', class: 'total-row', border: '', type: col.type });
    } else if (col.type === 'EdaColumnPercentage') {
      totalsRow.push({ data: ctx.cellAggregation.percentageOfGrandTotal(row, col), style: 'right', class: 'total-row', border: '', type: col.type });
    } else if (firstNonNumericRow) {
      totalsRow.push({ data: `${ctx.totalsLabel} `, border: ' ', class: 'total-row-header', type: col.type });
      firstNonNumericRow = false;
    } else {
      totalsRow.push({ data: ' ', border: ' ', class: 'total-row', type: col.type });
    }
  });
  return totalsRow;
}

export function colSubTotals(ctx: TotalsContext, page: number): TotalRowCell[] {
  const offset = page * ctx.initRows - ctx.initRows;
  const partialRow = sumPartialRows(ctx, offset);
  const cols = ctx.getCols();
  const rows = ctx.getRows();

  const partialTotalsRow: TotalRowCell[] = [];
  let firstNonNumericRow = true;
  cols.forEach(col => {
    if (col.type === 'EdaColumnNumber') {
      partialTotalsRow.push({ data: parseFloat(partialRow[col.field]).toLocaleString('de-DE'), style: 'right', class: 'sub-total-row', border: '', type: col.type });
    } else if (col.type === 'EdaColumnPercentage') {
      partialTotalsRow.push({ data: ctx.cellAggregation.percentageOfPageTotal(partialRow, col, rows), style: 'right', class: 'sub-total-row', border: '', type: col.type });
    } else if (firstNonNumericRow) {
      partialTotalsRow.push({ data: `${ctx.subTotalsLabel} `, border: ' ', class: 'sub-total-row-header', type: col.type });
      firstNonNumericRow = false;
    } else {
      const cell = ctx.cellAggregation.nonNumericSubtotalCell(col, partialRow);
      if (cell) {
        partialTotalsRow.push({ data: cell.data, border: ' ', class: `sub-total-row-header ${cell.classSuffix}`.trim(), type: col.type });
      } else {
        partialTotalsRow.push({ data: ' ', border: ' ', class: 'sub-total-row', type: col.type });
      }
    }
  });
  return partialTotalsRow;
}

// ---------------------------------------------------------------------------
// colsPercentages / removePercentages
// ---------------------------------------------------------------------------

export function colsPercentages(ctx: TotalsContext, percentageColumnsRef: { value: EdaColumn[] }, onlyPercentages: boolean): void {
  if (percentageColumnsRef.value.length !== 0) {
    removePercentages(ctx, percentageColumnsRef);
  }

  const numericColsMap = new Map<string, number>();
  const newColumns: EdaColumn[] = [];
  percentageColumnsRef.value = [];

  ctx.getCols().forEach(col => {
    newColumns.push(col);
    if (col.type === 'EdaColumnNumber') {
      const column = new EdaColumnPercentage({ header: col.header + '%', field: col.field + '%' });
      if (col.rowTotal === true) {
        column.rowTotal = true;
        column.styleClass = 'total-col';
      } else {
        column.styleClass = 'text-right';
      }
      newColumns.push(column);
      percentageColumnsRef.value.push(column);
      numericColsMap.set(col.field, 0);
    }
  });

  const rows = ctx.getRows();
  rows.forEach(row => {
    numericColsMap.forEach((value, key) => {
      const addend = row[key] === '' ? 0 : parseFloat(row[key]);
      numericColsMap.set(key, parseFloat(String(value)) + addend);
    });
  });

  rows.forEach(row => {
    numericColsMap.forEach((value, key) => {
      const newField = key + '%';
      const percentage = (row[key] / value) * 100;
      row[newField] = isNaN(percentage) ? ' ~ ' : percentage.toFixed(2) + '%';
    });
  });

  ctx.setCols(newColumns);

  if (!onlyPercentages) {
    const metricCount = new Set(ctx.header.getLeafLabels().map(l => l.title)).size;
    ctx.header.scalePercentageColspans('double', metricCount);
  }

  if (onlyPercentages) {
    ctx.getCols().forEach(col => {
      if (col.type === 'EdaColumnNumber') col.visible = false;
    });
  }
}

export function removePercentages(ctx: TotalsContext, percentageColumnsRef: { value: EdaColumn[] }): void {
  const hiddenColumns = ctx.getCols().some(col => col.visible === false);
  if (!hiddenColumns) {
    ctx.header.scalePercentageColspans('halve', 0);
  }

  ctx.getRows().forEach(row => {
    percentageColumnsRef.value.forEach(col => { delete row[col.field]; });
  });

  const cols: EdaColumn[] = [];
  ctx.getCols().forEach(column => {
    if (!percentageColumnsRef.value.includes(column)) {
      column.visible = true;
      cols.push(column);
    }
  });
  percentageColumnsRef.value = [];
  ctx.setCols(cols);
}

// ---------------------------------------------------------------------------
// noRepeatedRows — plain-table-only (checkTotals() only calls this `if (!pivot)`)
// ---------------------------------------------------------------------------

function extractDataValues(rows: any[]): any[][] {
  return rows.map(row => Object.values(row));
}

function extractLabels(rows: any[]): string[] {
  const labels: any[] = [Object.keys(rows[0])];
  labels.forEach(e => e.forEach((key: string) => labels.push(key)));
  return labels;
}

export function noRepeatedRows(
  ctx: TotalsContext,
  origValues: any[],
  flags: { noRepetitions?: boolean; resultAsPecentage: boolean; onlyPercentages: boolean },
): void {
  if (flags.noRepetitions === undefined) return;

  const rows = ctx.getRows();

  if (!flags.noRepetitions && !flags.resultAsPecentage && !flags.onlyPercentages) {
    ctx.replaceRows(_.cloneDeep(origValues));
    return;
  }

  if (!flags.noRepetitions && (flags.resultAsPecentage || flags.onlyPercentages)) {
    const values = extractDataValues(rows);
    const labels = extractLabels(rows);
    labels.shift();
    const output: any[] = [];
    for (let i = 0; i < values.length; i++) {
      const obj: any = [];
      for (let e = 0; e < values[i].length; e++) {
        const col = ctx.getCols().find(c => c.field === labels[e]);
        obj[labels[e]] = !col || !['EdaColumnPercentage', 'EdaColumnNumber'].includes(col.type)
          ? origValues[i][labels[e]]
          : values[i][e];
      }
      output.push(obj);
    }
    ctx.replaceRows(output);
    return;
  }

  const values = extractDataValues(rows);
  const labels = extractLabels(rows);
  labels.shift();
  const output: any[] = [];
  let first = _.cloneDeep(values[0]);
  for (let i = 0; i < values.length; i++) {
    const obj: any = [];
    if (i === 0) {
      for (let e = 0; e < values[i].length; e++) obj[labels[e]] = values[i][e];
    } else {
      for (let e = 0; e < values[i].length; e++) {
        obj[labels[e]] = values[i][e] === first[e] && isNaN(values[i][e]) ? '' : values[i][e];
        first[e] = values[i][e];
      }
    }
    output.push(obj);
  }
  ctx.replaceRows(output);
}

// ---------------------------------------------------------------------------
// CellAggregationStrategy implementations
// ---------------------------------------------------------------------------

export class FlatCellAggregation implements CellAggregationStrategy {
  percentageOfGrandTotal(_grandTotalRow: any, _percentageCol: EdaColumn): string {
    return '100.00%';
  }

  percentageOfPageTotal(pageTotalRow: any, percentageCol: EdaColumn, allRows: any[]): string {
    const numericField = percentageCol.field.slice(0, -1);
    const globalSum = allRows.reduce((acc, row) => acc + (row[numericField] === '' ? 0 : parseFloat(row[numericField]) || 0), 0);
    const pageSum = pageTotalRow[numericField] || 0;
    return globalSum !== 0 ? ((pageSum / globalSum) * 100).toFixed(2) + '%' : ' ~ ';
  }

  nonNumericSubtotalCell(): null {
    return null;
  }
}

export class MatrixCellAggregation implements CellAggregationStrategy {
  private percentageOfSiblingTotal(row: any, percentageCol: EdaColumn): string {
    const numericField = percentageCol.field.slice(0, -1);
    const value = Number(row[numericField]);
    const total = Object.keys(row)
      .filter(key => !key.endsWith('%') && key.includes('~'))
      .reduce((sum, key) => sum + Number(row[key] || 0), 0);
    return !Number.isNaN(value) && !Number.isNaN(total) && total !== 0
      ? ((value / total) * 100).toFixed(2) + '%'
      : ' ~ ';
  }

  percentageOfGrandTotal(grandTotalRow: any, percentageCol: EdaColumn): string {
    return this.percentageOfSiblingTotal(grandTotalRow, percentageCol);
  }

  percentageOfPageTotal(pageTotalRow: any, percentageCol: EdaColumn): string {
    return this.percentageOfSiblingTotal(pageTotalRow, percentageCol);
  }

  nonNumericSubtotalCell(col: EdaColumn, pageTotalRow: any): { data: string; classSuffix: string } {
    const baseField = (col.field.trimStart().startsWith('~') ? '  ' : ' ') + col.field.replace('%', '').trim();
    const value = Number(pageTotalRow[baseField]);
    const total = Object.keys(pageTotalRow)
      .filter(key => !key.endsWith('%') && key.includes('~'))
      .reduce((sum, key) => sum + Number(pageTotalRow[key] || 0), 0);
    const percentage = !Number.isNaN(value) && !Number.isNaN(total) && total !== 0 ? ((value / total) * 100).toFixed(2) : '0';
    return { data: percentage + '%', classSuffix: 'text-right' };
  }
}
