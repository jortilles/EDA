import { PromptUtil } from '../../../utils/prompt.util' 

// Servicio de generacion de Arreglos y Objetos para la asistencia del usurio
export default class QueryResolver {

    static getFields(tables: any[], data: any[]) {

        let currentQuery: any[] = [];

        tables.forEach((t: any) => {

            const table = data.find( (item: any) => item.table_name.toLowerCase().trim() === t.table.toLowerCase().trim() );

            if (!table) return;

            t.columns.forEach((c: any) => {

                const column = table.columns.find( (item: any) => item.column_name.toLowerCase().trim() === c.column.toLowerCase().trim() );

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

    static getFilters(filters: any[]) {
        
        console.log('filterssssssssssss : ', filters);
        
        let selectedFilters: any[] = [];

        filters.forEach(((filter: any) => {

            const filterObject = {
                isGlobal: false,
                filter_id: PromptUtil.generateUUID(),
                filter_table: filter.table,
                filter_column: filter.column,
                filter_column_type: filter.column_type,
                filter_type: filter.filter_type,
                filter_elements: filter.values,
                selectedRange: null,
                autorelation: null, 
                joins: []                
            }

            selectedFilters.push(filterObject);
        }))

        return selectedFilters;
    }

}
