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

/**
 * Adds to the stored tables of a plugin model the relations of the regenerated model they lack.
 * Refreshing a model keeps the stored tables with their relations, so without this a relation
 * added by a newer plugin version (e.g. to a new model view) would only exist on one side.
 * Stored relations, including those hidden by the user, are never changed.
 */
export function mergePluginRelations(generatedTables: any[], storedTables: any[]): void {
    const key = (r: any) => [r.source_table, ...(r.source_column || []), '>', r.target_table, ...(r.target_column || [])].join('|');
    const generatedByName = new Map<string, any>(generatedTables.map(t => [t.table_name, t]));
    for (const stored of storedTables) {
        const generated = generatedByName.get(stored.table_name);
        if (!generated?.relations?.length) continue;
        stored.relations = stored.relations || [];
        const existing = new Set(stored.relations.map(key));
        for (const relation of generated.relations) {
            if (!existing.has(key(relation))) stored.relations.push(JSON.parse(JSON.stringify(relation)));
        }
    }
}
