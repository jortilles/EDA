export default class QueryFieldResolver {

    static getFields(tables: any[], data: any[]) {

        let currentQuery: any[] = [];

        tables.forEach((t: any) => {

            const table = data.find(
                (item: any) =>
                    item.table_name.toLowerCase().trim() ===
                    t.table.toLowerCase().trim()
            );

            if (!table) return;

            t.columns.forEach((c: any) => {

                const column = table.columns.find(
                    (item: any) =>
                        item.column_name.toLowerCase().trim() ===
                        c.toLowerCase().trim()
                );

                if (!column || !column.visible) return;

                const col = structuredClone(column);

                col.table_id = table.table_name;

                if (col.column_type === 'numeric') {
                    const agg = col.aggregation_type.find((a: any) => a.value === 'sum');
                    if (agg) agg.selected = true;
                }

                if (col.column_type === 'text' || col.column_type === 'date') {
                    const agg = col.aggregation_type.find((a: any) => a.value === 'none');
                    if (agg) agg.selected = true;
                }

                currentQuery.push(col);
            });

        });

        return currentQuery;
    }

}
