/**
 * Key identifying a query field in the result labels: its column_name, or
 * `table_id.display_name` when another field of the same query shares that column_name
 * (e.g. contacts.name and products.name, or the same column added twice). The display_name
 * is the SQL alias of the field, so it is unique within the query. Unique column names keep
 * the plain column_name so configurations saved against it (axes, widths, styles,
 * links...) keep working.
 *
 * Must stay in line with eda_app's result-column-key.ts.
 */
export function resultColumnKey(field: any, fields: any[]): string {
    const repeated = (fields || []).filter(f => f.column_name === field.column_name).length > 1;
    if (!repeated) return field.column_name;
    // display_name is a plain string in the query sent to the API, { default } in the app
    const displayName = typeof field.display_name === 'string' ? field.display_name : field.display_name?.default;
    return `${field.table_id}.${displayName}`;
}
