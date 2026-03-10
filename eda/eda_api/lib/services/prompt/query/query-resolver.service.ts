import { PromptUtil } from '../../../utils/prompt.util';
import ManagerConnectionService from '../../../services/connection/manager-connection.service';


// Servicio de generacion de Arreglos y Objetos para la asistencia del usuario
export default class QueryResolver {
    
    // Helper: escapa comillas simples para evitar SQL injection en valores
    private static sanitize(value: any): string {
        return String(value).replace(/'/g, "''");
    }
    
    // Helper: obtiene la conexión a la BD
    private static async getConnection(parameters: any) {
        const connection = await ManagerConnectionService.getConnection(parameters.dataSource_id, undefined);
        connection.client = await connection.getclient();
        return connection;
    }

    /* ================================> INICIO TABLAS Y COLUMNAS <================================*/
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
    /* ================================> FIN TABLAS Y COLUMNAS <================================*/


    /* ================================> INICIO FILTROS <================================*/
    // Construye el array de selectedFilters a partir de los filtros raw de la IA
    static getFilters(filters: any[]) {

        let selectedFilters: any[] = [];

        filters.forEach((filter: any) => {
            let filterElements: any[] = [];
            
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
            } else if(filter.column_type === 'text' || filter.column_type === 'numeric' || filter.column_type === 'coordinate' || filter.column_type === 'date'){                 
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
        })

        return selectedFilters;
    }

    // Funcion que devuelve los filtros de cada columna los filteredColumns
    static getFilteredColumns(filters: any[], currentQuery: any[]) {

        let filteredColumns: any[] = [];

        filters.forEach((filter: any) => {

            if(!currentQuery.some((column: any) => column.table_id === filter.table && column.column_name === filter.column)) {
                let aggregation_type: any[] = [];

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

                filteredColumns.push({
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

        return filteredColumns;
    }

    // Valida si los valores del filtro existen en la BD (case-insensitive) => Devuelve { found, notFound }
    static async validateFilterValues(filter: any, parameters: any): Promise<{ found: string[], notFound: string[] }> {
        const connection = await this.getConnection(parameters);
        const inList = filter.values.map((v: any) => `UPPER('${this.sanitize(v)}')`).join(', ');
        const query = `SELECT DISTINCT "${filter.column}" FROM "${filter.table}" WHERE UPPER("${filter.column}") IN (${inList})`;
        const rows = await connection.execQuery(query);
        const found: string[] = rows.map((r: any) => String(r[filter.column] ?? Object.values(r)[0]));
        const notFound: string[] = filter.values.filter((v: any) =>
            !found.some((f: string) => f.toUpperCase() === String(v).toUpperCase())
        );
        return { found, notFound };
    }

    // Recorre los filtros de texto qualificantes y devuelve el primero que no matchea (o null si todos ok)
    static async validateTextFilters(filters: any[], parameters: any): Promise<{
        unresolvedFilter: any | null;
        notFound: string[];
        resolvedFiltersRaw: any[];
    }> {
        const qualifyingTypes = ['=', '!=', 'in', 'not_in'];
        const resolvedFiltersRaw: any[] = [];

        for (const filter of filters) {
            if (filter.column_type === 'text' && qualifyingTypes.includes(filter.filter_type) && filter.values?.length > 0) {
                const { notFound } = await this.validateFilterValues(filter, parameters);
                if (notFound.length > 0) {
                    return { unresolvedFilter: filter, notFound, resolvedFiltersRaw };
                }
            }
            resolvedFiltersRaw.push(filter);
        }

        return { unresolvedFilter: null, notFound: [], resolvedFiltersRaw: filters };
    }

    // Devuelve todos los valores distintos de una columna (max 200)
    static async getAllFilterOptions(filter: any, parameters: any): Promise<string[]> {
        const connection = await this.getConnection(parameters);
        const query = `SELECT DISTINCT "${filter.column}" FROM "${filter.table}" WHERE "${filter.column}" IS NOT NULL ORDER BY "${filter.column}" ASC LIMIT 200`;
        const rows = await connection.execQuery(query);
        return rows.map((r: any) => String(r[filter.column] ?? Object.values(r)[0]));
    }

    // Devuelve valores distintos que coincidan con un patrón LIKE (max 50)
    static async searchFilterByPattern(filter: any, pattern: string, parameters: any): Promise<string[]> {
        const connection = await this.getConnection(parameters);
        const safePattern = this.sanitize(pattern);
        const query = `SELECT DISTINCT "${filter.column}" FROM "${filter.table}" WHERE UPPER("${filter.column}") LIKE UPPER('%${safePattern}%') ORDER BY "${filter.column}" ASC LIMIT 50`;
        const rows = await connection.execQuery(query);
        return rows.map((r: any) => String(r[filter.column] ?? Object.values(r)[0]));
    }
    /* ================================> FIN FILTROS <================================*/


}
