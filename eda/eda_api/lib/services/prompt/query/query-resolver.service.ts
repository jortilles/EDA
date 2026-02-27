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
        
        let selectedFilters: any[] = [];

        filters.forEach(((filter: any) => {
            let filterElements: any;
            
            if(
                filter.filter_type === "not_null" || 
                filter.filter_type === "not_null_nor_empty" || 
                filter.filter_type === "null_or_empty"
            ) {
                    filterElements = [];
            } else if(
                filter.filter_type === "in" ||
                filter.filter_type === "not_in"
            ) {
                filterElements = [
                    { value1: filter.values }
                ]                
            } else {

                if(filter.column_type === 'text' || filter.column_type === 'numeric' || filter.column_type === 'coordinate') {
                    if(
                        filter.filter_type === "=" ||
                        filter.filter_type === "!=" ||
                        filter.filter_type === ">" ||
                        filter.filter_type === "<" ||
                        filter.filter_type === ">=" ||
                        filter.filter_type === "<=" ||
                        filter.filter_type === "like" ||
                        filter.filter_type === "not_like"
                    ) {
                        filterElements = [
                            { value1: filter.values }
                        ]
                    } else if(filter.filter_type === "between") {
                        filterElements = [
                            { value1: [filter.values[0]] },
                            { value2: [filter.values[1]] }
                        ]
                    }
                } else if(filter.column_type === 'date'){
                    filterElements = [
                        [
                            { value1: [filter.values[0]] },
                            { value2: [filter.values[1]] }
                        ]
                    ]
                }

            }

            const filterObject = {
                isGlobal: false,
                filter_id: PromptUtil.generateUUID(),
                filter_table: filter.table,
                filter_column: filter.column,
                filter_column_type: filter.column_type,
                filter_type: filter.filter_type,
                filter_elements: filterElements,
                selectedRange: null,
                autorelation: null, 
                joins: []                
            }

            selectedFilters.push(filterObject);
        }))

        return selectedFilters;
    }

    static getFilteredColumns(filters: any[], currentQuery: any[]) {

        let filtredColumns: any[] = [];

        filters.forEach((filter: any) => {
            if(!currentQuery.some((column: any) => column.table_id === filter.table && column.column_name === filter.column)) {
                let aggregation_type: any = {}

                if(filter.column_type === 'text') {
                    aggregation_type = [
                        { value: "count", display_name: "Cuenta Valores" },
                        { value: "count_distinct", display_name: "Valores Distintos" },
                        { value: "none", display_name: "No" },
                    ]

                } else if(filter.column_type === 'numeric') {
                    aggregation_type = [
                        { value: "sum", display_name: "Suma" },
                        { value: "avg", display_name: "Media" },
                        { value: "max", display_name: "Máximo" },
                        { value: "min", display_name: "Mínimo" },
                        { value: "count", display_name: "Cuenta Valores" },
                        { value: "count_distinct", display_name: "Valores Distintos" },
                        { value: "none", display_name: "No" },
                    ]

                } else if(filter.column_type === 'date' || filter.column_type === 'coordinate') {
                    aggregation_type = [
                        { value: "none", display_name: "No" },
                    ]
                }

                filtredColumns.push({
                    aggregation_type: aggregation_type,
                    column_granted_roles: [],
                    column_name: filter.column,
                    column_type: filter.column_type,
                    description: {
                        default: filter.column,
                        localized: [],
                    },
                    display_name: {
                        default: filter.column,
                        localized: [],
                    },
                    minimumFractionDigits: null,
                    row_granted_roles: [],
                    tableCount: 0,
                    table_id: filter.table,
                    visible: true,
                })
            }
        })        

        return filtredColumns;
    }

}
