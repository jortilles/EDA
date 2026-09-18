import { EdaBlankPanelComponent } from '../eda-blank-panel.component';
import { QueryUtils } from './query-utils';

/** One grouping level's result, straight from the backend — same [labels, rows] shape any
 *  other query response already has (dimension columns first, one column per aggregated
 *  numeric field last), so it's built the same way here as any other query result. */
export interface GroupedSubtotalLevel {
  labels: string[];
  rows: any[][];
}

/** One numeric column to subtotal, identified by display_name (see mergeRows for why). */
export interface GroupedSubtotalNumericColumn {
  displayName: string;
  aggregation: string;
}

/** One row destined for eda-table's row-object model — GROUPED_SUBTOTAL_LEVEL_KEY marks it as
 *  synthetic (see mergeRows); every other key is EdaColumn.field, matching a real detail row. */
export const GROUPED_SUBTOTAL_LEVEL_KEY = '__groupedSubtotalLevel';

const GROUP_KEY_SEP = '␟';

export const GroupedSubtotalsUtils = {

  /**
   * Fetches every "grouped subtotals" level in a single request to the dedicated backend
   * endpoint (see getGroupedSubtotalsData in dashboard.controller.ts) — the backend loops
   * over the N nesting levels itself, one plain GROUP BY + aggregate query per level.
   *
   * Columns are identified by INDEX into query.fields on the wire, never by name: the same
   * underlying column can appear twice in a query at different date granularities ("Order
   * date" / "Order date mes" share column_name AND, in principle, display_name could collide
   * too), so this resolves display_name -> index itself, once, right before sending — nothing
   * downstream ever matches by name again.
   *
   * Reuses QueryUtils.initEdaQuery(ebp) for the query envelope (model_id, dashboard,
   * fields, filters, ...) — the exact same construction every other query already goes
   * through — instead of building request params by hand, which is where the bugs were
   * last time, not in the query-building logic itself.
   */
  fetchLevels: async (
    ebp: EdaBlankPanelComponent,
    groupByDisplayNames: string[],
    numericColumns: GroupedSubtotalNumericColumn[]
  ): Promise<GroupedSubtotalLevel[]> => {
    if (!groupByDisplayNames.length || !numericColumns?.length) return [];

    const source: any[] = ebp.currentQuery || [];
    // display_name shows up as either the {default, localized} i18n object or an already-
    // flattened plain string depending on the source — handle both the same way table-dialog's
    // picker does, so the two never disagree on what a column is called.
    const nameOf = (f: any) => (typeof f.display_name === 'string' ? f.display_name : f.display_name?.default) || f.column_name;

    const fieldIndexes = groupByDisplayNames.map(name => {
      const idx = source.findIndex(f => nameOf(f) === name);
      if (idx === -1) throw new Error(`Columna de agrupación "${name}" no encontrada en la consulta actual`);
      return idx;
    });
    const numericFields = numericColumns.map(nc => {
      const idx = source.findIndex(f => nameOf(f) === nc.displayName);
      if (idx === -1) throw new Error(`Columna numérica "${nc.displayName}" no encontrada en la consulta actual`);
      return { fieldIndex: idx, aggregation: nc.aggregation };
    });

    const query = QueryUtils.initEdaQuery(ebp);
    const body = { ...query, groupBy: { fieldIndexes, numericFields } };

    const response = await ebp.dashboardService.executeGroupedSubtotalsQuery(body).toPromise();
    return (response?.levels || []).map(([labels, rows]: [string[], any[][]]) => ({ labels, rows }));
  },

  /**
   * Interleaves the per-level subtotal rows into eda-table's row objects (keyed by
   * EdaColumn.field — displayNameToField maps each grouping/numeric display_name to that
   * field), sorted by the grouping columns so each group is contiguous. Subtotal VALUES
   * always come from `levels` (the DB-computed aggregates) — this only re-sorts/re-positions
   * rows it already has, it never sums anything itself. Emits subtotals innermost-first
   * whenever a group changes (and once more at the very end), so a Pais+Ciudad change also
   * closes the Pais group in the same pass. Returns a NEW array; `rows` itself is untouched.
   */
  mergeRows(
    rows: any[],
    allFields: string[],
    displayNameToField: Record<string, string>,
    groupByDisplayNames: string[],
    numericColumns: GroupedSubtotalNumericColumn[],
    levels: GroupedSubtotalLevel[]
  ): any[] {
    if (!groupByDisplayNames.length || !levels.length) return rows;

    const dimFields = groupByDisplayNames.map(name => displayNameToField[name]);
    const numFields = (numericColumns || []).map(nc => displayNameToField[nc.displayName]);
    if (dimFields.some(f => !f) || !numFields.length || numFields.some(f => !f)) return rows;

    // [labels, rows] -> {groupValues, values}[]: dims first, one value per numeric column last.
    const levelValues = levels.map(({ rows: levelRows }) =>
      levelRows.map(row => ({
        groupValues: row.slice(0, row.length - numFields.length).map(v => String(v)),
        values: row.slice(row.length - numFields.length)
      }))
    );

    const sorted = [...rows].sort((a, b) => {
      for (const f of dimFields) {
        const av = String(a[f]), bv = String(b[f]);
        if (av !== bv) return av < bv ? -1 : 1;
      }
      return 0;
    });

    const levelMaps = levelValues.map(levelRows => {
      const map = new Map<string, any[]>();
      levelRows.forEach(r => map.set(r.groupValues.join(GROUP_KEY_SEP), r.values));
      return map;
    });

    const keyFor = (row: any, depth: number) =>
      dimFields.slice(0, depth + 1).map(f => String(row[f])).join(GROUP_KEY_SEP);

    const buildSubtotalRow = (level: number, row: any): any => {
      const key = keyFor(row, level);
      const values = levelMaps[level].get(key);
      const subtotalRow: any = { [GROUPED_SUBTOTAL_LEVEL_KEY]: level };
      allFields.forEach(f => {
        const numPos = numFields.indexOf(f);
        if (numPos !== -1) { subtotalRow[f] = values ? values[numPos] : null; return; }
        const dimPos = dimFields.slice(0, level + 1).indexOf(f);
        subtotalRow[f] = dimPos !== -1 ? `${row[f]} Total` : '';
      });
      return subtotalRow;
    };

    const out: any[] = [];
    let prevRow: any = null;

    sorted.forEach(row => {
      if (prevRow) {
        let changedLevel = -1;
        for (let d = 0; d < dimFields.length; d++) {
          if (String(row[dimFields[d]]) !== String(prevRow[dimFields[d]])) { changedLevel = d; break; }
        }
        if (changedLevel !== -1) {
          for (let level = dimFields.length - 1; level >= changedLevel; level--) {
            out.push(buildSubtotalRow(level, prevRow));
          }
        }
      }
      out.push(row);
      prevRow = row;
    });

    if (prevRow) {
      for (let level = dimFields.length - 1; level >= 0; level--) {
        out.push(buildSubtotalRow(level, prevRow));
      }
    }

    return out;
  }
};
