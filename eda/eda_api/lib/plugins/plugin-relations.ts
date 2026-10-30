export function linkTables(
    tables: any[],
    srcTable: string, srcCol: string,
    tgtTable: string, tgtCol: string
): void {
    const byName = new Map<string, any>(tables.map(t => [t.table_name, t]));
    const src = byName.get(srcTable);
    const tgt = byName.get(tgtTable);
    if (!src || !tgt) return;

    src.relations.push({ source_table: srcTable, source_column: [srcCol], target_table: tgtTable, target_column: [tgtCol], visible: true });
    tgt.relations.push({ source_table: tgtTable, source_column: [tgtCol], target_table: srcTable, target_column: [srcCol], visible: true });
}

/**
 * Removes the sync control tables (e.g. holded_sync_control.csv, written by each plugin's
 * sync service to track the last update) from a generated model. They are internal
 * bookkeeping, not user data. Mutates the array in place.
 */
export function dropSyncControlTables(tables: any[]): void {
    for (let i = tables.length - 1; i >= 0; i--) {
        if (/_sync_control$/.test(tables[i]?.table_name || '')) tables.splice(i, 1);
    }
}
