/**
 * Unified N-axis aggregation engine for eda-crosstable, replacing eda-table.ts's
 * PivotTable() two-branch implementation: a legacy single-axis pivot (buildPivotSerie/
 * generatePivotParams/populateMap/buildHeaders) and a drag-drop 2-axis cross table
 * (buildCrossSerie/generateCrossParams/populateCrossMap/buildCrossHeaders) that were
 * near-duplicate pairs.
 *
 * Unification insight: the legacy 1-axis pivot is the SAME {itemX, itemY, itemZ} axis
 * shape as the drag-drop cross table, with itemX always fixed to exactly one dimension
 * (the "main" text column) and itemZ always "every numeric column". `synthesizeLegacyAxis`
 * produces that implicit config so both paths share one engine.
 *
 * `hasConfiguredAxis` (= `ordering[0] !== undefined` in the original) is the ACTUAL
 * discriminator the original code branches on — not axis dimension count — and it drives
 * every real behavioral difference this file preserves:
 *  - Tree leaf fill value: 0 (legacy) vs '' (cross) — see buildMapTree.
 *  - Row survival: legacy never drops a row (every leaf starts as a real number, so the
 *    "keep if any value !== ''" filter in mergeAxisRows always passes); cross drops rows
 *    whose every non-X cell stayed the '' sentinel. This is the SAME filter run
 *    unconditionally for both — it naturally reproduces both behaviors because of the
 *    leaf-fill choice, not because of a separate drop/no-drop flag.
 *  - `rangeOption` and the header `description` (tooltip) text on a few specific label
 *    cells: the original's cross path already sources these from `matchingCol?.header`/
 *    the axis config's own `.description`, while the legacy path sources them from the
 *    real column's `.description` metadata — a PREEXISTING divergence between the two
 *    paths today, not something unification introduces. Preserved via explicit
 *    `hasConfiguredAxis` branches at exactly those points; verified against
 *    eda-table.characterization.spec.ts's captured fixtures show it doesn't affect
 *    `title`, `column`, or matching — for both paths.
 *
 * The `itemX`/`itemY` (match by `column_name === col.field`) vs `itemZ` (match by
 * `description === col.header`) inconsistency in the original `generateCrossParams()` is
 * preserved as-is here too — `synthesizeLegacyAxis` sets `itemZ[i].description` to the
 * column's HEADER (not its `.description` metadata) specifically because that matching
 * rule requires it, not because it's semantically a description.
 */
import * as _ from 'lodash';
import { EdaColumn } from '../eda-table/eda-columns/eda-column';
import { EdaColumnText } from '../eda-table/eda-columns/eda-column-text';
import { EdaColumnNumber } from '../eda-table/eda-columns/eda-column-number';
import { HeaderRow, HeaderLabel } from '../eda-table-core/eda-table.header';

export interface AxisItem {
  column_name: string;
  description: string;
}

export interface AxisConfig {
  itemX: AxisItem[];
  itemY: AxisItem[];
  itemZ: AxisItem[];
}

export interface CrossTableBuildResult {
  rows: any[];
  cols: EdaColumn[];
  series: HeaderRow[];
  rowAxisLeafColumnCount: number;
  singleMetricDescription?: string;
  hasConfiguredAxis: boolean;
}

export interface CrossTableBuildOptions {
  crossSortOrder: 'alphabetical' | 'value' | 'valueAsc';
  navColumnSubstitution: Record<string, string>;
  hasConfiguredAxis: boolean;
}

// ---------------------------------------------------------------------------
// synthesizeLegacyAxis
// ---------------------------------------------------------------------------

/**
 * Synthesizes the implicit axis config for the legacy (no drag-drop `ordering`) pivot
 * UI: first text column -> itemX (exactly 1 dimension), remaining text columns -> itemY,
 * every numeric column -> itemZ. Matches today's generatePivotParams()'s auto-selection
 * (getColsInfo()'s text[0] as the main column).
 *
 * itemZ[i].description is set to the column's HEADER, not its `.description` metadata —
 * generateAxisParams() matches itemZ entries to columns via `col.header === description`
 * (a preexisting quirk of the original generateCrossParams(), preserved as-is), so this
 * field must carry the header for that lookup to work, even though every other AxisItem
 * uses `.description` for genuinely descriptive (tooltip) text.
 */
export function synthesizeLegacyAxis(sourceCols: EdaColumn[]): AxisConfig {
  const textCols = sourceCols.filter(c => c.type !== 'EdaColumnNumber');
  const numericCols = sourceCols.filter(c => c.type === 'EdaColumnNumber');
  const [mainCol, ...pivotCols] = textCols;

  return {
    itemX: [{ column_name: mainCol.field, description: mainCol.description }],
    itemY: pivotCols.map(c => ({ column_name: c.field, description: c.description })),
    itemZ: numericCols.map(c => ({ column_name: c.field, description: c.header })),
  };
}

// ---------------------------------------------------------------------------
// sortValuesByTotal — ported unchanged (no pivot/cross dependency)
// ---------------------------------------------------------------------------

function sortValuesByTotal(
  values: string[],
  fieldName: string,
  oldRows: any[],
  metricFields: string[],
  descending: boolean,
): string[] {
  const totals = new Map<string, number>();
  values.forEach(v => totals.set(String(v), 0));
  oldRows.forEach(row => {
    const v = String(row[fieldName]);
    if (totals.has(v)) {
      metricFields.forEach(metric => {
        const val = parseFloat(row[metric]);
        if (!isNaN(val)) totals.set(v, totals.get(v)! + val);
      });
    }
  });
  return descending
    ? [...values].sort((a, b) => (totals.get(String(b)) || 0) - (totals.get(String(a)) || 0))
    : [...values].sort((a, b) => (totals.get(String(a)) || 0) - (totals.get(String(b)) || 0));
}

// ---------------------------------------------------------------------------
// generateAxisParams — unifies generatePivotParams() + generateCrossParams()
// ---------------------------------------------------------------------------

interface AxisParams {
  mainCols: EdaColumn[];
  mainColsLabels: string[];
  aggregatedColLabels: string[];
  pivotColsLabels: string[];
  pivotCols: EdaColumn[];
  oldRows: any[];
  newCols: string[][];
}

function generateAxisParams(
  sourceRows: any[],
  sourceCols: EdaColumn[],
  axis: AxisConfig,
  opts: CrossTableBuildOptions,
): AxisParams {
  const navSub = opts.navColumnSubstitution || {};
  const oldRows = sourceRows;

  const aggregatedColLabels: string[] = [];
  axis.itemZ.forEach(e => {
    sourceCols.forEach(c => {
      if (c.header === e.description) aggregatedColLabels.push(c.field);
    });
  });

  const pivotCols: EdaColumn[] = [];
  const pivotColsLabels: string[] = [];
  sourceCols.forEach(e => {
    axis.itemY.forEach(y => {
      const effectiveName = navSub[y.column_name] || y.column_name;
      if (e.field === effectiveName) {
        pivotCols.push(e);
        pivotColsLabels.push(e.field);
      }
    });
  });

  const mainCols: EdaColumn[] = [];
  const mainColsLabels: string[] = [];
  sourceCols.forEach(e => {
    axis.itemX.forEach(x => {
      const effectiveName = navSub[x.column_name] || x.column_name;
      if (e.field === effectiveName) {
        mainCols.push(e);
        mainColsLabels.push(e.field);
      }
    });
  });

  const newCols: string[][] = [];
  axis.itemX.forEach(e => {
    const effectiveName = navSub[e.column_name] || e.column_name;
    newCols.push(_.orderBy(_.uniq(_.map(sourceRows, effectiveName))));
  });
  axis.itemY.forEach(e => {
    const effectiveName = navSub[e.column_name] || e.column_name;
    newCols.push(_.orderBy(_.uniq(_.map(sourceRows, effectiveName))));
  });

  if (opts.crossSortOrder === 'value' || opts.crossSortOrder === 'valueAsc') {
    const descending = opts.crossSortOrder === 'value';
    axis.itemX.forEach((e, i) => {
      const effectiveName = navSub[e.column_name] || e.column_name;
      newCols[i] = sortValuesByTotal(newCols[i], effectiveName, oldRows, aggregatedColLabels, descending);
    });
    axis.itemY.forEach((e, j) => {
      const effectiveName = navSub[e.column_name] || e.column_name;
      newCols[axis.itemX.length + j] = sortValuesByTotal(newCols[axis.itemX.length + j], effectiveName, oldRows, aggregatedColLabels, descending);
    });
  }

  return { mainCols, mainColsLabels, aggregatedColLabels, pivotColsLabels, pivotCols, oldRows, newCols };
}

// ---------------------------------------------------------------------------
// buildMapTree / populateMapTree — unifies buildMainMap+buildMapRecursive+
// buildSubMapTree / buildMapCrossRecursive+buildSubMapCrossTree and populateMap/
// populateCrossMap. See the file-level comment for why the leaf fill value alone
// (0 vs '') is enough to reproduce both the legacy and cross paths' behavior.
// ---------------------------------------------------------------------------

function buildSubMapTree(keys: string[], values: string[], hasConfiguredAxis: boolean): Map<string, any> {
  const out = new Map<string, any>();
  keys.forEach(key => {
    const valuesMap = new Map<string, any>();
    values.forEach(value => valuesMap.set(value, hasConfiguredAxis ? '' : 0));
    out.set(key, valuesMap);
  });
  return out;
}

function buildMapTree(cols: string[][], hasConfiguredAxis: boolean): Map<string, any> {
  if (cols.length === 2) return buildSubMapTree(cols[0], cols[1], hasConfiguredAxis);
  const unsetCols = cols.slice(1);
  const map = new Map<string, any>();
  cols[0]?.forEach(col => map.set(col, buildMapTree(unsetCols, hasConfiguredAxis)));
  return map;
}

function populateMapTree(
  map: Map<string, any>,
  rows: any[],
  mainColsLabels: string[],
  aggregatedColLabel: string,
  pivotColsLabels: string[],
): Map<string, any> {
  const cloneMainColsLabels = _.cloneDeep(mainColsLabels);
  const firstMainColsLabel = cloneMainColsLabels[0];
  cloneMainColsLabels.shift();
  const traversalLabels = [...cloneMainColsLabels, ...pivotColsLabels];

  rows.forEach(row => {
    const value = row[aggregatedColLabel];
    const steps = traversalLabels.length - 1;
    let lastMapKey = map.get(row[firstMainColsLabel]);
    let i = 0;
    for (i = 0; i < steps; i++) {
      lastMapKey = lastMapKey.get(row[traversalLabels[i]]);
    }
    const actualValue = lastMapKey.get(row[traversalLabels[i]]);
    lastMapKey.set(row[traversalLabels[i]], Number(actualValue) + value);
  });
  return map;
}

// ---------------------------------------------------------------------------
// buildAxisRows — unifies buildNewRows(+buildNewRowsRecursive) and buildNewCrossRows
// (+recursiveAccessCrossTable+combineArrays). Both always emit one row per X-axis
// combination — the row-dropping behavior lives in mergeAxisRows, not here.
// ---------------------------------------------------------------------------

function buildNewRowsRecursive(map: Map<string, any>, colLabel: string, row: Array<{ label: string; value: any }>, serieLabel: string) {
  map.forEach((value, key) => {
    if (typeof value !== 'object') {
      let label = `${colLabel} ~ ${key} ~ ${serieLabel}`;
      label = label.substr(2);
      row.push({ label, value });
      return;
    }
    buildNewRowsRecursive(value, `${colLabel} ~ ${key}`, row, serieLabel);
  });
  return row;
}

function recursiveAccessCrossTable(map: Map<string, any>, keys: string[]): any {
  if (keys.length === 0) return map;
  const [firstKey, ...remainingKeys] = keys;
  const nextMap = map.get(firstKey);
  if (nextMap instanceof Map) return recursiveAccessCrossTable(nextMap, remainingKeys);
  return nextMap;
}

function combineArrays(arrays: any[][]): any[][] {
  const result: any[][] = [];
  function combine(currentIndex: number, currentCombination: any[]) {
    if (currentIndex === arrays.length) {
      result.push(currentCombination);
      return;
    }
    arrays[currentIndex].forEach(e => combine(currentIndex + 1, [...currentCombination, e]));
  }
  combine(0, []);
  return result;
}

function buildAxisRows(map: Map<string, any>, mainColsLabels: string[], serieLabel: string, newCols: string[][]): any[] {
  const arraysMain: string[][] = [];
  mainColsLabels.forEach((_e, i) => { arraysMain[i] = _.cloneDeep(newCols[i]); });

  const combinations = combineArrays(arraysMain);

  const rows: any[] = [];
  combinations.forEach(element => {
    const row: any = {};
    mainColsLabels.forEach((main, j) => { row[main] = element[j]; });
    rows.push(row);
  });

  const rowsTest: any[] = [];
  combinations.forEach(keys => {
    const row: any = {};
    const mapItem = recursiveAccessCrossTable(map, keys);
    const pivotedCols = buildNewRowsRecursive(mapItem, '', [], serieLabel);
    pivotedCols.forEach(col => { row[col.label] = col.value; });
    rowsTest.push(row);
  });

  return rows.map((item, index) => ({ ...item, ...rowsTest[index] }));
}

// ---------------------------------------------------------------------------
// mergeAxisRows / mergeAxisColumns — unifies mergeRows/mergeCrossRows and
// mergeColumns/mergeCrossColumns. See the file-level comment: the same unconditional
// filter reproduces both "never drop" (legacy) and "drop empty" (cross) because of the
// leaf-fill choice made in buildMapTree, not because of a branch here.
// ---------------------------------------------------------------------------

function mergeAxisRows(rowsToMerge: any[][], mainAxisLabelCount: number): any[] {
  const numRowsInSeries = rowsToMerge[0].length;
  const numSeries = rowsToMerge.length;
  const rows: any[] = [];
  for (let row = 0; row < numRowsInSeries; row++) {
    let newRow: any = {};
    for (let serie = 0; serie < numSeries; serie++) {
      newRow = { ...newRow, ...rowsToMerge[serie][row] };
    }
    rows.push(newRow);
  }

  const newRows: any[] = [];
  rows.forEach(row => {
    let contador = 0;
    for (const propiedad in row) {
      contador++;
      if (contador > mainAxisLabelCount) {
        if (row[propiedad] !== '') {
          newRows.push(row);
          return;
        }
      }
    }
  });
  return newRows;
}

function mergeAxisColumns(colsToMerge: EdaColumn[][], mainAxisLabelCount: number): EdaColumn[] {
  const numCols = colsToMerge[0].length;
  const cols: EdaColumn[] = [];
  for (let i = 0; i < mainAxisLabelCount; i++) cols.push(colsToMerge[0][i]);
  for (let col = mainAxisLabelCount; col < numCols; col++) {
    colsToMerge.forEach(serie => cols.push(serie[col]));
  }
  return cols;
}

// ---------------------------------------------------------------------------
// buildAxisSerie — unifies buildPivotSerie/buildCrossSerie
// ---------------------------------------------------------------------------

interface AxisSerieResult {
  cols: EdaColumn[];
  rows: any[];
  newLabels: { mainsLabels: string[]; seriesLabels: string[][]; metricsLabels: string[] };
}

function buildAxisSerie(
  serieIndex: number,
  sourceRows: any[],
  sourceCols: EdaColumn[],
  axis: AxisConfig,
  opts: CrossTableBuildOptions,
): AxisSerieResult {
  const params = generateAxisParams(sourceRows, sourceCols, axis, opts);
  const mapTree = buildMapTree(params.newCols, opts.hasConfiguredAxis);
  const populatedMap = populateMapTree(mapTree, params.oldRows, params.mainColsLabels, params.aggregatedColLabels[serieIndex], params.pivotColsLabels);

  const newRows = buildAxisRows(populatedMap, params.mainColsLabels, params.aggregatedColLabels[serieIndex], params.newCols);
  const newColNames = Object.keys(newRows[0]).slice(params.mainColsLabels.length);

  const tableColumns: EdaColumn[] = [];
  params.mainCols.forEach(mainCol => {
    tableColumns.push(new EdaColumnText({
      header: mainCol.header,
      field: mainCol.field,
      // Cross's original forwards rangeOption from the source column; legacy's original
      // never did. Preserved as a real, preexisting divergence — not unified away.
      rangeOption: opts.hasConfiguredAxis ? mainCol.rangeOption : undefined,
    }));
  });
  newColNames.forEach(col => tableColumns.push(new EdaColumnNumber({ header: col, field: col })));

  const newColsCopy = params.newCols.slice();
  return {
    cols: tableColumns,
    rows: newRows,
    newLabels: {
      mainsLabels: params.mainColsLabels,
      seriesLabels: newColsCopy.slice(params.mainColsLabels.length),
      metricsLabels: [],
    },
  };
}

// ---------------------------------------------------------------------------
// buildAxisHeaders — unifies buildHeaders/buildCrossHeaders
// ---------------------------------------------------------------------------

interface BuildAxisHeadersInput {
  mainsLabels: string[];
  seriesLabels: string[][];
  metricsLabels: string[];
  metricsDescriptions: string[];
}

function buildAxisHeaders(
  labels: BuildAxisHeadersInput,
  axis: AxisConfig,
  resultCols: EdaColumn[],
  sourceCols: EdaColumn[],
  navSub: Record<string, string>,
  hasConfiguredAxis: boolean,
): HeaderRow[] {
  const series: HeaderRow[] = [];
  const numRows = labels.seriesLabels.length + 1;
  let numCols = 1;
  labels.seriesLabels.forEach(label => { numCols *= label.length; });
  numCols *= labels.metricsLabels.length;

  // --- mains (leading X-axis column header cell(s)) ---
  // Genuinely divergent between the two original paths (not just a naming difference):
  // legacy never forwarded rangeOption and sourced the tooltip `description` from the
  // real column's `.description` metadata; cross forwards rangeOption and sources the
  // tooltip from the matched column's HEADER (or the axis item's own description as a
  // fallback). Preserved as two explicit branches rather than one merged formula.
  const mains: HeaderLabel[] = axis.itemX.map((item, j) => {
    const effectiveName = navSub[item.column_name] || item.column_name;
    const matchingCol = sourceCols.find(c => c.field === effectiveName);
    if (hasConfiguredAxis) {
      return {
        title: matchingCol?.header || item.description,
        column: effectiveName,
        rowspan: numRows, colspan: 1, sortable: true,
        description: matchingCol?.header || item.description,
        rangeOption: matchingCol?.rangeOption || false,
      };
    }
    return {
      title: matchingCol?.header,
      column: effectiveName,
      rowspan: numRows, colspan: 1, sortable: true,
      description: matchingCol?.description,
    };
  });
  series.push({ labels: mains });

  // --- metric label row(s) ---
  // Title is always driven by metricsLabels (== itemZ[i].description == the metric
  // column's header, per synthesizeLegacyAxis's matching constraint) for both paths —
  // only the tooltip `description` source genuinely differs.
  const metricDescriptionAt = (i: number) => (hasConfiguredAxis ? labels.metricsLabels[i] : labels.metricsDescriptions[i]);
  // NOT hasConfiguredAxis-dependent: the original's legacy path arrives at the SAME value
  // via a side effect (buildHeaders() does `colsInfo.textDescriptions.splice(0, 1)`, and
  // `labels.textDescriptions` is the SAME array by reference — set once, before the splice,
  // in PivotTable() — so `labels.textDescriptions[i]` post-splice equals pivotCols[i]'s own
  // description, i.e. exactly `itemY[i].description`). Cross's original indexes
  // `itemY[i].description` directly. Both paths land on the same source; no branch needed.
  const seriesRowDescriptionAt = (dimIndex: number) => axis.itemY[dimIndex]?.description;

  if (labels.metricsLabels.length > 1) {
    for (let i = 0; i < labels.seriesLabels[0].length; i++) {
      series[0].labels.push({
        title: labels.seriesLabels[0][i],
        description: seriesRowDescriptionAt(0),
        rowspan: 1, colspan: numCols / labels.seriesLabels[0].length, sortable: false,
      });
    }
  } else {
    series[0].labels.push({
      title: labels.metricsLabels[0],
      rowspan: 1, colspan: numCols,
      description: metricDescriptionAt(0),
    });
    const serie: HeaderRow = { labels: [] };
    for (let i = 0; i < labels.seriesLabels[0].length; i++) {
      serie.labels.push({
        title: labels.seriesLabels[0][i],
        description: seriesRowDescriptionAt(0),
        rowspan: 1, colspan: numCols / labels.seriesLabels[0].length, sortable: false,
        metric: labels.metricsLabels[0],
      });
    }
    series.push(serie);
  }

  let mult = labels.seriesLabels[0].length;
  let colspanDiv = numCols / labels.seriesLabels[0].length;
  for (let i = 1; i < labels.seriesLabels.length; i++) {
    const serie: HeaderRow = { labels: [] };
    for (let j = 0; j < labels.seriesLabels[i].length * mult; j++) {
      serie.labels.push({
        title: labels.seriesLabels[i][j % labels.seriesLabels[i].length],
        description: seriesRowDescriptionAt(i),
        rowspan: 1, colspan: colspanDiv / labels.seriesLabels[i].length, sortable: false,
        metric: labels.metricsLabels[0],
      });
    }
    series.push(serie);
    mult *= labels.seriesLabels[i].length;
    colspanDiv = colspanDiv / labels.seriesLabels[i].length;
  }

  if (labels.metricsLabels.length > 1) {
    const serie: HeaderRow = { labels: [] };
    for (let i = 0; i < numCols; i++) {
      const mi = i % labels.metricsLabels.length;
      serie.labels.push({
        title: labels.metricsLabels[mi],
        description: metricDescriptionAt(mi),
        rowspan: 1, colspan: 1, sortable: false,
        metric: labels.metricsLabels[mi],
      });
    }
    series.push(serie);
  }

  const lastRow = series[series.length - 1];
  lastRow.labels.forEach((label, i) => {
    label.column = resultCols[i + (resultCols.length - lastRow.labels.length)].field;
    label.sortable = true;
    label.sortState = false;
  });

  return series;
}

// ---------------------------------------------------------------------------
// buildCrossTable — public entry point, replaces PivotTable()'s two branches
// ---------------------------------------------------------------------------

export function buildCrossTable(
  sourceRows: any[],
  sourceCols: EdaColumn[],
  axis: AxisConfig,
  opts: CrossTableBuildOptions,
): CrossTableBuildResult {
  const navSub = opts.navColumnSubstitution || {};
  const rowsToMerge: any[][] = [];
  const colsToMerge: EdaColumn[][] = [];
  let serieResult: AxisSerieResult | undefined;

  axis.itemZ.forEach((_e, index) => {
    const result = buildAxisSerie(index, sourceRows, sourceCols, axis, opts);
    rowsToMerge.push(result.rows);
    colsToMerge.push(result.cols);
    if (index === 0) serieResult = result;
  });

  const mainAxisLabelCount = axis.itemX.length;
  const rows = mergeAxisRows(rowsToMerge, mainAxisLabelCount);
  const cols = mergeAxisColumns(colsToMerge, mainAxisLabelCount);

  const metricsDescriptions = axis.itemZ.map(e => {
    const matching = sourceCols.find(c => c.header === e.description);
    return matching?.description;
  });

  const series = buildAxisHeaders(
    {
      mainsLabels: serieResult!.newLabels.mainsLabels,
      seriesLabels: serieResult!.newLabels.seriesLabels,
      metricsLabels: axis.itemZ.map(e => e.description),
      metricsDescriptions,
    },
    axis,
    cols,
    sourceCols,
    navSub,
    opts.hasConfiguredAxis,
  );

  const singleMetricDescription = opts.hasConfiguredAxis && axis.itemZ.length === 1 ? axis.itemZ[0].description : undefined;

  return {
    rows,
    cols,
    series,
    rowAxisLeafColumnCount: mainAxisLabelCount,
    singleMetricDescription,
    hasConfiguredAxis: opts.hasConfiguredAxis,
  };
}
