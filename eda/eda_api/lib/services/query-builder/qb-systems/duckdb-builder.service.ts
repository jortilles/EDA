import { EdaQueryParams, QueryBuilderService } from '../query-builder.service';
import * as _ from 'lodash';

export class DuckDBBuilderService extends QueryBuilderService {

    // ── Core query generation ────────────────────────────────────────────────

    public simpleQuery(columns: string[], origin: string, view: boolean) {
        const schema = this.dataModel.ds.connection.schema;
        if (schema && !view) {
            origin = `"${schema}"."${origin}"`;
        }
        return `SELECT DISTINCT ${columns.join(', ')} \nFROM ${origin}`;
    }

    public analizedQuery(params: EdaQueryParams) {
        const { fields, tables, origin, dest, joinTree, filters, joinType, valueListJoins, schema } = params;

        const fromTable = tables.filter(table => table.name === origin)
            .map(table => table.query ? this.cleanViewString(table.query) : table.name)[0];
        const vista = tables.filter(table => table.name === origin)
            .map(table => !!table.query)[0];

        const generateQuery = () => {
            let myQuery: string = '';
            if (vista) {
                myQuery += `FROM ${fromTable}`;
            } else {
                myQuery += `FROM "${schema}"."${fromTable}"`;
            }
            let joinString: any[];
            let alias: any;
            if (this.queryTODO.joined) {
                const responseJoins = this.setJoins(joinTree, joinType ?? 'inner', schema ?? 'main', valueListJoins ?? []);
                joinString = responseJoins.joinString;
                alias = responseJoins.aliasTables;
            } else {
                joinString = this.getJoins(joinTree, dest, tables, joinType, valueListJoins, schema);
            }
            joinString.forEach(x => { myQuery = myQuery + '\n' + x; });
            myQuery += this.getFilters(filters);
            if (alias) {
                for (const key in alias) {
                    myQuery = myQuery.split(key).join(`"${alias[key]}"`);
                }
            }
            return myQuery;
        };

        const countTablesInSQL = (query: string) => {
            const normalizedQuery = query.toUpperCase();
            const fromCount = (normalizedQuery.match(/\bFROM\b/g) || []).length;
            const joinCount = (normalizedQuery.match(/\bJOIN\b/g) || []).length;
            return fromCount + joinCount;
        };

        const querys: any = {};
        const fromQuery = generateQuery();

        querys['general'] = [
            `SELECT '${countTablesInSQL(fromQuery)}' AS "count_tables"`
        ];

        for (const col of fields) {
            const diplayName = col.display_name;
            const table_column = `"${col.table_id}"."${col.column_name}"`;
            const mainQuery = `(SELECT ${table_column} ${fromQuery}) AS main`;

            querys[diplayName] = [];
            querys[diplayName].push(`SELECT '${col.table_id}' AS source_table`);
            querys[diplayName].push(`SELECT COUNT( * ) AS "count_rows" FROM ${col.table_id}`);

            if (col.column_type === 'text' || col.column_type === 'html') {
                querys[diplayName].push(
                    `SELECT SUM(CASE WHEN "main"."${col.column_name}" IS NULL THEN 1 ELSE 0 END) AS "count_nulls" FROM ${mainQuery}`
                );
                querys[diplayName].push(
                    `SELECT SUM(CASE WHEN "main"."${col.column_name}" = '' THEN 1 ELSE 0 END) AS "count_empty" FROM ${mainQuery}`
                );
                querys[diplayName].push(
                    `SELECT COUNT(DISTINCT "main"."${col.column_name}") AS "count_distinct" FROM ${mainQuery}`
                );
                querys[diplayName].push(`
          SELECT STRING_AGG(label_count, ', ') AS most_duplicated
          FROM (
              SELECT
                  "main"."${col.column_name}" || ' (' || COUNT("main"."${col.column_name}") || ')' AS label_count
              FROM ${mainQuery}
              GROUP BY "main"."${col.column_name}"
              ORDER BY COUNT("main"."${col.column_name}") DESC
              LIMIT 5
          ) sub;
        `);
                querys[diplayName].push(`
          SELECT STRING_AGG(label_count, ', ') AS least_duplicated
          FROM (
              SELECT
                  "main"."${col.column_name}" || ' (' || COUNT("main"."${col.column_name}") || ')' AS label_count
              FROM ${mainQuery}
              GROUP BY "main"."${col.column_name}"
              ORDER BY COUNT("main"."${col.column_name}") ASC
              LIMIT 5
          ) sub;
        `);
            } else if (col.column_type === 'numeric') {
                querys[diplayName].push(
                    `SELECT SUM(CASE WHEN "main"."${col.column_name}" IS NULL THEN 1 ELSE 0 END) AS "count_nulls" FROM ${mainQuery}`
                );
                querys[diplayName].push(`SELECT MAX("main"."${col.column_name}") AS "max" FROM ${mainQuery}`);
                querys[diplayName].push(`SELECT MIN("main"."${col.column_name}") AS "min" FROM ${mainQuery}`);
                querys[diplayName].push(`
            WITH moda_counts AS (
                SELECT "main"."${col.column_name}" AS mode_value, COUNT(*) AS frequency
                FROM ${mainQuery}
                GROUP BY 1
                ORDER BY 2 DESC
                LIMIT 1
            )
            SELECT mode_value || ' (total: '|| frequency ||')' AS "mode"
            FROM  moda_counts;
        `);
                // DuckDB does not support trunc(x, n) — use round(x, n) instead
                querys[diplayName].push(`SELECT ROUND( AVG("main"."${col.column_name}"), 3) AS "avg" FROM ${mainQuery}`);
                querys[diplayName].push(
                    `SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "main"."${col.column_name}") AS "median" FROM ${mainQuery}`
                );
            } else if (col.column_type === 'date') {
                querys[diplayName].push(
                    `SELECT SUM(CASE WHEN "main"."${col.column_name}" IS NULL THEN 1 ELSE 0 END) AS "count_nulls" FROM ${mainQuery}`
                );
                querys[diplayName].push(
                    `SELECT strftime(MAX("main"."${col.column_name}"), '%Y-%m-%d') AS "max" FROM ${mainQuery}`
                );
                querys[diplayName].push(
                    `SELECT strftime(MIN("main"."${col.column_name}"), '%Y-%m-%d') AS "min" FROM ${mainQuery}`
                );
                const queryMonth = `
            WITH monthly_counts AS (
                SELECT strftime("main"."${col.column_name}", '%Y-%m') AS vmonth, COUNT(*) AS total
                FROM ${mainQuery}
                GROUP BY 1
            )
        `;
                querys[diplayName].push(
                    `${queryMonth} SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total) AS median_count_bymonth FROM monthly_counts;`
                );
                querys[diplayName].push(
                    `${queryMonth} SELECT (vmonth || ' (total: ' || total || ')') "max_bymonth" FROM monthly_counts ORDER BY total DESC LIMIT 1;`
                );
                querys[diplayName].push(
                    `${queryMonth} SELECT (vmonth || ' (total: ' || total || ')') "min_bymonth" FROM monthly_counts ORDER BY total ASC LIMIT 1;`
                );
            }
        }

        return querys;
    }

    public normalQuery(
        columns: string[], origin: string, dest: any[], joinTree: any[],
        grouping: any[], filters: any[], havingFilters: any[],
        tables: Array<any>, limit: number, joinType: string, groupByEnabled: boolean,
        valueListJoins: any[], schema: string, database: string, forSelector: any, sortedFilters?: any[]
    ) {
        if (!schema || schema === 'null' || schema === '') {
            schema = 'main';
        }

        let myQuery = `SELECT ${columns.join(', ')} \n`;
        let o = tables.filter(table => table.name === origin)
            .map(table => table.query ? this.cleanViewString(table.query) : table.name)[0];
        let vista = tables.filter(table => table.name === origin)
            .map(table => !!table.query)[0];

        if (vista) {
            myQuery += `FROM ${o}`;
        } else {
            myQuery += `FROM "${schema}"."${o}"`;
        }

        if (forSelector === true) {
            if (vista) {
                myQuery = `SELECT DISTINCT ${columns.join(', ')} \nFROM ${o}`;
            } else if (schema) {
                myQuery = `SELECT DISTINCT ${columns.join(', ')} \nFROM "${schema}"."${o}"`;
            } else {
                myQuery = `SELECT DISTINCT ${columns.join(', ')} \nFROM "${o}"`;
            }
        }

        // JOINS
        let joinString: any[];
        let alias: any;
        if (this.queryTODO.joined) {
            const responseJoins = this.setJoins(joinTree, joinType, schema, valueListJoins);
            joinString = responseJoins.joinString;
            alias = responseJoins.aliasTables;
        } else {
            joinString = this.getJoins(joinTree, dest, tables, joinType, valueListJoins, schema);
        }

        joinString.forEach(x => { myQuery = myQuery + '\n' + x; });

        // WHERE
        if (Array.isArray(sortedFilters) && sortedFilters.length !== 0) {
            myQuery += this.getSortedFilters(sortedFilters, filters);
        } else {
            myQuery += this.getFilters(filters);
        }

        // GROUP BY — sorting columns first, then regular grouping (no duplicates)
        const sortingCols: any[] = this.queryTODO.resultSortingColumns ?? [];
        const effectiveGrouping: string[] = [];
        const addedToGrouping = new Set<string>();

        for (const col of sortingCols) {
            const matchingField = this.queryTODO.fields.find(
                (f: any) => f.table_id === col.table_id && f.column_name === col.column_name
            );
            if (matchingField?.aggregation_type && matchingField.aggregation_type !== 'none') continue;

            let tc: string;
            if (matchingField?.computed_column === 'computed') {
                if (matchingField.column_type !== 'numeric') continue;
                tc = `"${col.column_name}"`;
            } else {
                tc = `"${col.table_id}"."${col.column_name}"`;
            }
            if (!addedToGrouping.has(tc)) {
                effectiveGrouping.push(tc);
                addedToGrouping.add(tc);
            }
        }
        for (const g of grouping) {
            if (!addedToGrouping.has(g)) {
                effectiveGrouping.push(g);
                addedToGrouping.add(g);
            }
        }

        if (effectiveGrouping.length > 0 && groupByEnabled) {
            myQuery += '\ngroup by ' + effectiveGrouping.join(', ');
        }

        // HAVING
        myQuery += this.getHavingFilters(havingFilters);

        // ORDER BY
        let orderColumns: string[];
        if (sortingCols.length > 0) {
            orderColumns = sortingCols
                .filter(col => col.ordenation_type !== 'No' && col.ordenation_type !== undefined)
                .map(col => {
                    const matchingField = this.queryTODO.fields.find(
                        (f: any) => f.table_id === col.table_id && f.column_name === col.column_name
                    );
                    if (matchingField) {
                        return `"${matchingField.display_name}" ${col.ordenation_type}`;
                    } else {
                        return `"${col.table_id}"."${col.column_name}" ${col.ordenation_type}`;
                    }
                });
        } else {
            orderColumns = this.queryTODO.fields
                .map((col: any) => {
                    if (col.ordenation_type !== 'No' && col.ordenation_type !== undefined) {
                        return `"${col.display_name}" ${col.ordenation_type}`;
                    }
                    return false;
                })
                .filter((e: any) => e !== false) as string[];
        }

        const orderStr = orderColumns.join(',');
        if (orderStr.length > 0) {
            myQuery = `${myQuery}\norder by ${orderStr}`;
        }
        if (limit) myQuery += `\nlimit ${limit}`;

        if (alias) {
            for (const key in alias) {
                myQuery = myQuery.split(key).join(`"${alias[key]}"`);
            }
        }

        return myQuery;
    }

    // ── Filters ──────────────────────────────────────────────────────────────

    public getFilters(filters) {
        if (this.permissions.length > 0) {
            this.permissions.forEach(permission => { filters.push(permission); });
        }
        if (filters.length) {
            let equalfilters = this.getEqualFilters(filters);
            filters = filters.filter(f => !equalfilters.toRemove.includes(f.filter_id));
            let filtersString = `\nwhere 1 = 1 `;

            filters.forEach(f => {
                const column = this.findColumn(f.filter_table, f.filter_column);
                const colname = this.getFilterColname(column);
                if (['not_null', 'not_null_nor_empty', 'null_or_empty'].includes(f.filter_type)) {
                    filtersString += '\nand ' + this.filterToString(f);
                } else {
                    let nullValueIndex = f.filter_elements[0].value1.indexOf(null);
                    if (nullValueIndex !== -1) {
                        if (f.filter_elements[0].value1.length === 1) {
                            if (f.filter_type === '=') {
                                filtersString += `\nand ${colname}  is null `;
                            } else {
                                filtersString += `\nand ${colname}  is not null `;
                            }
                        } else {
                            if (f.filter_type === '=') {
                                filtersString += `\nand (${this.filterToString(f)} or ${colname}  is null) `;
                            } else {
                                filtersString += `\nand (${this.filterToString(f)} or ${colname}  is not null) `;
                            }
                        }
                    } else {
                        filtersString += '\nand ' + this.filterToString(f);
                    }
                }
            });

            filtersString = this.mergeFilterStrings(filtersString, equalfilters);
            return filtersString;
        } else {
            return '';
        }
    }

    public getSortedFilters(sortedFilters: any[], filters: any[]): any {
        if (filters.length === 0) { return ''; }

        if (this.permissions.length > 0) {
            this.permissions.forEach(permission => { filters.push(permission); });
        }

        filters.forEach((filter: any) => {
            if (filter.valueListSource !== undefined && filter.valueListSource !== null && filter.filter_id !== 'is_null') {
                const sf = sortedFilters.find((e: any) => e.filter_id === filter.filter_id);
                if (sf) sf.valueListSource = filter.valueListSource;
            }
        });

        sortedFilters.sort((a: any, b: any) => a.y - b.y);

        const nullSortedFilters = sortedFilters.filter((f: any) => ((f.isGlobal === true) && (f.filter_elements[0].value1.length === 0)));
        if (nullSortedFilters.length !== 0) {
            nullSortedFilters.sort((a: any, b: any) => a.y - b.y);
            nullSortedFilters.forEach(element => {
                for (let i = element.y + 1; i < sortedFilters.length; i++) {
                    if (element.x < sortedFilters[i].x) { sortedFilters[i].x -= 1; } else { break; }
                }
            });
            const newSortedFilters = sortedFilters.filter((f: any) => !((f.isGlobal === true) && (f.filter_elements[0].value1.length === 0)));
            newSortedFilters.forEach((f, i) => f.y = i);
            sortedFilters = _.cloneDeep(newSortedFilters);
        }

        filters.forEach(filter => {
            if (filter.isGlobal && (filter.filter_type === 'null_or_empty') && (filter.filter_elements[0].value1[0] === 'emptyString')) {
                const sf = sortedFilters.find(s => s.filter_id === filter.filter_id);
                if (sf) { sf.filter_type = 'null_or_empty'; sf.filter_elements = []; }
            }
            if (filter.filter_id === 'is_null') {
                const sf = sortedFilters.find(s => s.filter_id === filter.source_filter_id);
                if (sf) {
                    sf.sqlOptional = '';
                    if (filter.valueListSource === undefined) {
                        sf.sqlOptional += `"${filter.filter_table}"."${filter.filter_column}" is null or "${filter.filter_table}"."${filter.filter_column}" = '' or`;
                        sf.filter_elements[0].value1 = sf.filter_elements[0].value1.filter((e: any) => e !== 'emptyString');
                    } else {
                        sf.sqlOptional += `"${filter.valueListSource.target_table}"."${filter.valueListSource.target_id_column}" is null or "${filter.valueListSource.target_table}"."${filter.valueListSource.target_id_column}" = '' or`;
                        sf.filter_elements[0].value1 = sf.filter_elements[0].value1.filter((e: any) => e !== 'emptyString');
                    }
                }
            }
        });

        filters.forEach(filter => {
            if (filter.computed_column === 'computed') {
                const match = sortedFilters.find(s => s.filter_id === filter.filter_id);
                if (match) { match.computed_column = 'computed'; match.SQLexpression = filter.SQLexpression; }
            }
        });

        let stringQuery = '\nwhere ';

        const cadenaRecursiva = (item: any) => {
            const { y, x, filter_table, filter_column, filter_type, filter_column_type, filter_elements, valueListSource, sqlOptional, computed_column, SQLexpression } = item;

            let filter_type_value = filter_type === 'not_in' ? 'not in' : filter_type === 'not_like' ? 'not ilike' : filter_type === 'like' ? 'ilike' : filter_type;

            let filter_elements_value = '';
            if (filter_elements.length === 0) {
                if (filter_type === 'not_null') filter_type_value = 'is not null';
                if (filter_type === 'not_null_nor_empty') filter_type_value = 'is not null and';
                if (filter_type === 'null_or_empty') filter_type_value = 'is null or';
            } else {
                if (filter_elements[0].value1.length === 1) {
                    if (filter_column_type === 'text') {
                        filter_elements_value = (filter_type === 'in' || filter_type === 'not_in')
                            ? `('${filter_elements[0].value1[0]}')`
                            : `'${filter_type === 'like' || filter_type === 'not_like' ? '%' : ''}${filter_elements[0].value1[0]}${filter_type === 'like' || filter_type === 'not_like' ? '%' : ''}'`;
                    }
                    if (filter_column_type === 'numeric') {
                        filter_elements_value = filter_type === 'between'
                            ? ` ${Number(filter_elements[0].value1[0])} and ${Number(filter_elements[1]?.value2?.[0])}`
                            : (filter_type === 'in' || filter_type === 'not_in') ? `(${filter_elements[0].value1[0]})` : `${filter_elements[0].value1[0]}`;
                    }
                    if (filter_column_type === 'date') {
                        filter_elements_value = filter_type === 'between'
                            ? ` '${filter_elements[0].value1[0]}'::TIMESTAMP and '${filter_elements[1]?.value2?.[0]} 23:59:59'::TIMESTAMP`
                            : (filter_type === 'in' || filter_type === 'not_in') ? `('${filter_elements[0].value1[0]}'::TIMESTAMP)` : `'${filter_elements[0].value1[0]}'::TIMESTAMP`;
                    }
                } else {
                    filter_elements_value = '(';
                    const vals = filter_elements[0].value1;
                    if (filter_column_type === 'text' || filter_column_type === undefined) {
                        vals.forEach((e: any, i: number) => { filter_elements_value += `'${e}'${i === vals.length - 1 ? ')' : ','}`; });
                    } else if (filter_column_type === 'numeric') {
                        vals.forEach((e: any, i: number) => { filter_elements_value += `${e}${i === vals.length - 1 ? ')' : ','}`; });
                    } else if (filter_column_type === 'date') {
                        vals.forEach((e: any, i: number) => { filter_elements_value += `'${e}'::TIMESTAMP${i === vals.length - 1 ? ')' : ','}`; });
                    }
                }
            }

            const validador = (valueListSource !== undefined && valueListSource !== null);
            const tbl = validador ? valueListSource.target_table : filter_table;
            const col = validador ? valueListSource.target_description_column : filter_column;

            let resultado = computed_column === 'computed'
                ? `${['null_or_empty', 'not_null_nor_empty'].includes(filter_type) || (filter_type === 'in' && sqlOptional !== undefined) ? ' (' : ''} ${sqlOptional ?? ''} (${SQLexpression}) ${filter_type_value}${filter_elements_value}`
                : `${['null_or_empty', 'not_null_nor_empty'].includes(filter_type) || (filter_type === 'in' && sqlOptional !== undefined) ? ' (' : ''} ${sqlOptional ?? ''} "${tbl}"."${col}" ${filter_type_value}${filter_elements_value}`;

            if (filter_type === 'not_null_nor_empty') {
                resultado += computed_column === 'computed' ? ` (${SQLexpression}) != '')` : ` "${tbl}"."${col}" != '')`;
            }
            if (filter_type === 'null_or_empty') {
                resultado += computed_column === 'computed' ? ` (${SQLexpression}) = '')` : ` "${tbl}"."${col}" = '')`;
            }
            if (filter_type === 'in' && sqlOptional !== undefined) resultado += ' )';

            let elementosHijos: any[] = [];
            for (let n = y + 1; n < sortedFilters.length; n++) {
                if (sortedFilters[n].x === x) break;
                if (y < sortedFilters[n].y && sortedFilters[n].x === x + 1) elementosHijos.push(sortedFilters[n]);
            }

            const itemGenerico = sortedFilters.find((i: any) => i.y === y + 1);
            if (elementosHijos.length > 0) {
                const variableSpace = '            '.repeat(x + 1);
                let hijosCadena = '';
                elementosHijos.map(h => cadenaRecursiva(h)).forEach((hijo, idx) => {
                    hijosCadena += hijo;
                    if (idx < elementosHijos.length - 1) hijosCadena += ` \n ${variableSpace} ${elementosHijos[idx + 1].value.toUpperCase()} `;
                });
                resultado = `(${resultado} \n ${variableSpace} ${itemGenerico.value.toUpperCase()} (${hijosCadena}))`;
            }
            return resultado;
        };

        let itemsString = '( ';
        for (let r = 0; r < sortedFilters.length; r++) {
            if (sortedFilters[r].x === 0) {
                itemsString += (r === 0 ? '' : ' ' + sortedFilters[r].value.toUpperCase() + ' ') + sortedFilters.filter((e: any) => e.y === r).map(cadenaRecursiva)[0] + '\n';
            }
        }
        itemsString += ' )';
        stringQuery += itemsString;
        return stringQuery;
    }

    public filterToString(filterObject: any) {
        const column = this.findColumn(filterObject.filter_table, filterObject.filter_column);
        if (!column.hasOwnProperty('minimumFractionDigits')) {
            column.minimumFractionDigits = 0;
        }
        const colname = this.getFilterColname(column);
        let colType = column.column_type;

        if (filterObject.filter_dynamic === true) {
            colType = 'dynamic';
        }

        switch (this.setFilterType(filterObject.filter_type)) {
            case 0:
                if (filterObject.filter_type === '!=') { filterObject.filter_type = '<>'; }
                if (filterObject.filter_type === 'like') {
                    return `${colname}  ${'ilike'} '%${filterObject.filter_elements[0].value1}%' `;
                }
                if (filterObject.filter_type === 'not_like') {
                    filterObject.filter_type = 'not like';
                    return `${colname}  ${filterObject.filter_type} '%${filterObject.filter_elements[0].value1}%' `;
                }
                return `${colname}  ${filterObject.filter_type} ${this.processFilter(filterObject.filter_elements[0].value1, colType)} `;
            case 1:
                if (filterObject.filter_type === 'not_in') { filterObject.filter_type = 'not in'; }
                return `${colname}  ${filterObject.filter_type} (${this.processFilter(filterObject.filter_elements[0].value1, colType)}) `;
            case 2:
                return `${colname}  ${filterObject.filter_type}
                        ${this.processFilter(filterObject.filter_elements[0].value1, colType)} and ${this.processFilterEndRange(filterObject.filter_elements[1].value2, colType)}`;
            case 3:
                return `${colname} is not null`;
            case 5:
                return colType === 'text'
                    ? `(${colname} is not null and ${colname} != '')`
                    : `${colname} is not null`;
            case 6:
                return colType === 'text'
                    ? `(${colname} is null or ${colname} = '')`
                    : `${colname} is null`;
        }
    }

    public getFilterColname(column: any) {
        let colname: string;
        if (column.computed_column === 'no' || !column.hasOwnProperty('computed_column')) {
            colname = `"${column.table_id}"."${column.column_name}"`;
        } else {
            if (column.column_type === 'numeric') {
                colname = `ROUND(CAST(${column.SQLexpression} as numeric), ${column.minimumFractionDigits})`;
            } else {
                colname = `${column.SQLexpression}`;
            }
        }
        return colname;
    }

    public havingToString(filterObject: any) {
        const column = this.findHavingColumn(filterObject);
        if (!column.hasOwnProperty('minimumFractionDigits')) {
            column.minimumFractionDigits = 0;
        }
        const colname = this.getHavingColname(column);
        let colType = column.column_type;

        switch (this.setFilterType(filterObject.filter_type)) {
            case 0:
                if (filterObject.filter_type === '!=') { filterObject.filter_type = '<>'; }
                if (filterObject.filter_type === 'like') {
                    return `${colname}  ${'ilike'} '%${filterObject.filter_elements[0].value1}%' `;
                }
                if (filterObject.filter_type === 'not_like') {
                    filterObject.filter_type = 'not like';
                    return `${colname}  ${filterObject.filter_type} '%${filterObject.filter_elements[0].value1}%' `;
                }
                return `${colname}  ${filterObject.filter_type} ${this.processFilter(filterObject.filter_elements[0].value1, colType)} `;
            case 1:
                if (filterObject.filter_type === 'not_in') { filterObject.filter_type = 'not in'; }
                return `${colname}  ${filterObject.filter_type} (${this.processFilter(filterObject.filter_elements[0].value1, colType)}) `;
            case 2:
                return `${colname}  ${filterObject.filter_type}
                        ${this.processFilter(filterObject.filter_elements[0].value1, colType)} and ${this.processFilterEndRange(filterObject.filter_elements[1].value2, colType)}`;
            case 3:
                return `${colname} is not null`;
            case 5:
                return colType === 'text'
                    ? `(${colname} is not null and ${colname} != '')`
                    : `${colname} is not null`;
            case 6:
                return colType === 'text'
                    ? `(${colname} is null or ${colname} = '')`
                    : `${colname} is null`;
        }
    }

    public getHavingFilters(filters) {
        if (filters.length) {
            let filtersString = `\nhaving 1=1 `;
            filters.forEach(f => {
                const column = this.findHavingColumn(f);
                const colname = this.getHavingColname(column);

                if (['not_null', 'not_null_nor_empty', 'null_or_empty'].includes(f.filter_type)) {
                    filtersString += '\nand ' + this.havingToString(f);
                } else {
                    let nullValueIndex = f.filter_elements[0].value1.indexOf(null);
                    if (nullValueIndex !== -1) {
                        if (f.filter_elements[0].value1.length === 1) {
                            if (f.filter_type === '=') {
                                filtersString += `\nand ${colname}  is null `;
                            } else {
                                filtersString += `\nand ${colname}  is not null `;
                            }
                        } else {
                            if (f.filter_type === '=') {
                                filtersString += `\nand (${this.havingToString(f)} or ${colname}  is null) `;
                            } else {
                                filtersString += `\nand (${this.havingToString(f)} or ${colname}  is not null) `;
                            }
                        }
                    } else {
                        filtersString += '\nand ' + this.havingToString(f);
                    }
                }
            });
            return filtersString;
        } else {
            return '';
        }
    }

    // DuckDB: cast inside aggregation, no ::float suffix
    public getHavingColname(column: any) {
        let colname: string;
        if (column.computed_column === 'no' || !column.hasOwnProperty('computed_column')) {
            const colExpr = column.aggregation_type === 'count'
                ? `"${column.table_id}"."${column.column_name}"`
                : `"${column.table_id}"."${column.column_name}"::numeric`;
            colname = `ROUND(${column.aggregation_type}(${colExpr}), ${column.minimumFractionDigits})`;
        } else {
            if (column.column_type === 'numeric') {
                colname = `cast(${column.SQLexpression} as numeric(32, ${column.minimumFractionDigits}))`;
            } else {
                colname = `${column.SQLexpression}`;
            }
        }
        return colname;
    }

    // DuckDB date filters use ::TIMESTAMP instead of to_date()/to_timestamp()
    public processFilter(filter: any, columnType: string): string {
        if (columnType !== 'date') {
            // Delegate to base-class-compatible logic for non-date types
            filter = filter.map((elem: any) => (elem === null || elem === undefined) ? 'ihatenulos' : elem);
            if (!Array.isArray(filter)) {
                switch (columnType) {
                    case 'text': return `'${filter}'`;
                    case 'html': return `'${filter}'`;
                    case 'numeric': return filter;
                    case 'dynamic': return filter;
                }
            }
            let str = '';
            filter.forEach((value: any) => {
                const tail = ['numeric', 'dynamic'].includes(columnType) ? value : `'${String(value).replace(/'/g, "''")}'`;
                str = str + tail + ',';
            });
            filter.forEach((f: any) => {
                if (f === '(x => None)') {
                    switch (columnType) {
                        case 'text': str = `'(x => None)'  `; break;
                        case 'html': str = `'(x => None)'  `; break;
                        case 'numeric': str = 'null  '; break;
                    }
                }
            });
            return str.substring(0, str.length - 1);
        }

        const values = (Array.isArray(filter) ? filter : [filter])
            .map((v: any) => (v === null || v === undefined) ? 'ihatenulos' : v);
        if (values.some((v: any) => v === '(x => None)')) return `'4092-01-01'::TIMESTAMP`;
        return values
            .map((v: any) => v === 'ihatenulos' ? `'4092-01-01'::TIMESTAMP` : `'${v}'::TIMESTAMP`)
            .join(',');
    }

    public processFilterEndRange(filter: any, columnType: string): string {
        if (columnType !== 'date') {
            filter = filter.map((elem: any) => (elem === null || elem === undefined) ? 'ihatenulos' : elem);
            if (!Array.isArray(filter)) {
                switch (columnType) {
                    case 'text': return `'${filter}'`;
                    case 'html': return `'${filter}'`;
                    case 'numeric': return filter;
                }
            }
            let str = '';
            filter.forEach((value: any) => {
                const tail = columnType === 'numeric' ? value : `'${String(value).replace(/'/g, "''")}'`;
                str = str + tail + ',';
            });
            return str.substring(0, str.length - 1);
        }

        const values = (Array.isArray(filter) ? filter : [filter])
            .map((v: any) => (v === null || v === undefined) ? 'ihatenulos' : v);
        return values
            .map((v: any) => v === 'ihatenulos' ? `'4092-01-01 23:59:59'::TIMESTAMP` : `'${v} 23:59:59'::TIMESTAMP`)
            .join(',');
    }

    // ── Joins ────────────────────────────────────────────────────────────────
    // read_csv_auto infers types independently per file, so join columns can end
    // up as different types (e.g. INT64 vs VARCHAR). Wrapping both ON sides in
    // CAST(... AS VARCHAR) makes every join type-safe without changing the schema.

    public getJoins(joinTree: any[], dest: any[], tables: Array<any>, joinType: string, valueListJoins: any[], schema: string): string[] {
        if (!schema || schema === 'null' || schema === '') {
            schema = 'main';
        }

        const joins = [];
        const joined = [];
        const joinString = [];
        let myJoin = joinType;

        for (let i = 0; i < dest.length; i++) {
            const elem = joinTree.find(n => n.name === dest[i]);
            const tmp = [];
            elem.path.forEach(parent => { tmp.push(parent); });
            tmp.push(elem.name);
            joins.push(tmp);
        }

        joins.forEach(e => {
            for (let i = 0; i < e.length - 1; i++) {
                const j = i + 1;
                if (!joined.includes(e[j])) {
                    const joinColumns = this.findJoinColumns(e[j], e[i]);
                    const t = tables.filter(table => table.name === e[j])
                        .map(table => table.query ? this.cleanViewString(table.query) : table.name)[0];
                    const view = tables.filter(table => table.name === e[j])
                        .map(table => !!table.query)[0];

                    myJoin = valueListJoins.includes(e[j]) ? 'left' : joinType;

                    if (typeof joinColumns[0] === 'string') {
                        if (!view) {
                            if (joinColumns[2] && joinColumns[2] === 'source') {
                                joinString.push(` ${myJoin} join "${schema}"."${t}" on  CAST(${joinColumns[1]} AS VARCHAR) = CAST("${schema}"."${e[i]}"."${joinColumns[0]}" AS VARCHAR)`);
                            } else if (joinColumns[2] && joinColumns[2] === 'target') {
                                joinString.push(` ${myJoin} join "${schema}"."${t}" on CAST("${schema}"."${e[j]}"."${joinColumns[1]}" AS VARCHAR) = CAST(${joinColumns[0]} AS VARCHAR) `);
                            } else {
                                joinString.push(` ${myJoin} join "${schema}"."${t}" on CAST("${schema}"."${e[j]}"."${joinColumns[1]}" AS VARCHAR) = CAST("${schema}"."${e[i]}"."${joinColumns[0]}" AS VARCHAR)`);
                            }
                        } else {
                            joinString.push(` ${myJoin} join ${t} on  CAST("${e[j]}"."${joinColumns[1]}" AS VARCHAR) = CAST("${schema}"."${e[i]}"."${joinColumns[0]}" AS VARCHAR)`);
                        }
                    } else {
                        if (!view) {
                            let join = ` ${myJoin} join "${schema}"."${t}" on`;
                            joinColumns[0].forEach((_: any, x: number) => {
                                if (joinColumns[2] && joinColumns[2] === 'source') {
                                    join += `  CAST(${joinColumns[1][x]} AS VARCHAR) = CAST("${schema}"."${e[i]}"."${joinColumns[0][x]}" AS VARCHAR) and`;
                                } else if (joinColumns[2] && joinColumns[2] === 'target') {
                                    join += `  CAST("${schema}"."${e[j]}"."${joinColumns[1][x]}" AS VARCHAR) = CAST(${joinColumns[0][x]} AS VARCHAR) and`;
                                } else {
                                    join += `  CAST("${schema}"."${e[j]}"."${joinColumns[1][x]}" AS VARCHAR) = CAST("${schema}"."${e[i]}"."${joinColumns[0][x]}" AS VARCHAR) and`;
                                }
                            });
                            join = join.slice(0, join.length - 'and'.length);
                            joinString.push(join);
                        } else {
                            let join = ` ${myJoin} join  ${t}  on`;
                            joinColumns[0].forEach((_: any, x: number) => {
                                join += `  CAST("${e[j]}"."${joinColumns[1][x]}" AS VARCHAR) = CAST("${schema}"."${e[i]}"."${joinColumns[0][x]}" AS VARCHAR) and`;
                            });
                            join = join.slice(0, join.length - 'and'.length);
                            joinString.push(join);
                        }
                    }
                    joined.push(e[j]);
                }
            }
        });

        return joinString;
    }

    public setJoins(joinTree: any[], joinType: string, schema: string, valueListJoins: string[]) {
        if (!schema || schema === 'null') {
            schema = 'main';
        }

        const joinExists = new Set();
        const aliasTables = {};
        const joinString = [];
        const targetTableJoin = [];

        for (const join of joinTree) {
            const sourceLastDotInx = join[0].lastIndexOf('.');
            const [sourceTable, sourceColumn] = [join[0].substring(0, sourceLastDotInx), join[0].substring(sourceLastDotInx + 1)];
            const [targetTable, targetColumn] = join[1].split('.');

            let sourceJoin = `"${sourceTable}"."${sourceColumn}"`;
            let targetJoin = `"${targetTable}"."${targetColumn}"`;

            if (!joinExists.has(`${sourceJoin}=${targetJoin}`)) {
                joinExists.add(`${sourceJoin}=${targetJoin}`);

                let aliasSource: string;
                if (sourceJoin.split('.')[0] === targetJoin.split('.')[0]) {
                    aliasSource = `"${sourceTable}.${sourceColumn}"`;
                }

                let alias = `"${targetTable}.${targetColumn}.${sourceColumn}"`;
                if (aliasSource) { alias = aliasSource; }

                aliasTables[alias] = targetTable;

                let aliasTargetTable: string;
                if (targetTableJoin.includes(targetTable) || targetTable === sourceTable) {
                    aliasTargetTable = `${targetTable}${sourceColumn}`;
                    aliasTables[alias] = aliasTargetTable;
                }

                joinType = valueListJoins.includes(targetTable) ? 'LEFT' : joinType;

                let joinStr: string;
                if (aliasTargetTable) {
                    targetJoin = `"${aliasTargetTable}"."${targetColumn}"`;
                    joinStr = `${joinType} JOIN "${targetTable}" "${aliasTargetTable}" ON  CAST(${sourceJoin} AS VARCHAR) = CAST(${targetJoin} AS VARCHAR) `;
                } else {
                    joinStr = `${joinType} JOIN "${targetTable}" ON  CAST(${sourceJoin} AS VARCHAR) = CAST(${targetJoin} AS VARCHAR) `;
                }

                if (!joinString.includes(joinStr)) {
                    targetTableJoin.push(aliasTargetTable || targetTable);
                    joinString.push(joinStr);
                }
            }
        }

        return { joinString, aliasTables };
    }

    // ── Column selection ─────────────────────────────────────────────────────

    private duckdbDate(expr: string, format: string): string {
        switch (format) {
            case 'year':            return `strftime(${expr}, '%Y')`;
            case 'quarter':         return `(strftime(${expr}, '%Y-Q') || datepart('quarter', ${expr}))`;
            case 'month':           return `strftime(${expr}, '%Y-%m')`;
            case 'week':            return `strftime(${expr}, '%G-%V')`;
            case 'day':             return `strftime(${expr}, '%Y-%m-%d')`;
            case 'week_day':        return `EXTRACT(ISODOW FROM ${expr})`;
            case 'day_hour':        return `strftime(${expr}, '%Y-%m-%d %H')`;
            case 'day_hour_minute': return `strftime(${expr}, '%Y-%m-%d %H:%M')`;
            case 'timestamp':       return `strftime(${expr}, '%Y-%m-%d %H:%M:%S')`;
            default:                return `strftime(${expr}, '%Y-%m-%d')`;
        }
    }

    // Full reimplementation — DuckDB differences vs PostgreSQL:
    //   • Date formatting: strftime() instead of to_char()
    //   • Numeric aggregations: cast INSIDE the function — sum(col::numeric) — because
    //     DuckDB does not allow the postfix cast after an aggregation call.
    //   • No ::float at the end: result stays DECIMAL so DuckDBConnection.runQuery()
    //     can format it as a locale string that preserves trailing zeros ("1.234,50").
    public getSeparedColumns(origin: string, dest: string[]) {
        const columns: string[] = [];
        const grouping: string[] = [];

        this.queryTODO.fields.forEach(el => {
            el.order !== 0 && el.table_id !== origin && !dest.includes(el.table_id) ? dest.push(el.table_id) : false;

            let table_column: string;
            if (el.autorelation && !el.valueListSource && !this.queryTODO.forSelector) {
                table_column = `"${el.joins[el.joins.length - 1][0]}"."${el.column_name}"`;
            } else {
                table_column = `"${el.table_id}"."${el.column_name}"`;
            }

            let whatIfExpression = '';
            if (el.whatif_column) whatIfExpression = `${el.whatif.operator} ${el.whatif.value}`;

            el.minimumFractionDigits = el.minimumFractionDigits || 0;

            // ── Computed columns ──────────────────────────────────────────────
            if (el.computed_column === 'computed') {
                if (el.column_type === 'text' || el.column_type === 'html') {
                    if (el.aggregation_type === 'none') {
                        columns.push(`${el.SQLexpression} as "${el.display_name}"`);
                    } else if (el.aggregation_type === 'count_distinct') {
                        columns.push(`count(distinct ${el.SQLexpression}) as "${el.display_name}"`);
                    } else {
                        columns.push(`${el.aggregation_type}(${el.SQLexpression}) as "${el.display_name}"`);
                    }
                } else if (el.column_type === 'numeric') {
                    if (el.aggregation_type === 'none') {
                        columns.push(`cast(${el.SQLexpression} ${whatIfExpression} as numeric(32, ${el.minimumFractionDigits})) as "${el.display_name}"`);
                    } else if (el.aggregation_type === 'count_distinct') {
                        columns.push(`cast(count(distinct(${el.SQLexpression} ${whatIfExpression})) as numeric(32, ${el.minimumFractionDigits})) as "${el.display_name}"`);
                    } else {
                        columns.push(`cast(${el.aggregation_type}(${el.SQLexpression} ${whatIfExpression}) as numeric(32, ${el.minimumFractionDigits})) as "${el.display_name}"`);
                    }
                } else if (el.column_type === 'date') {
                    const dateFmt = this.duckdbDate(el.SQLexpression, el.format);
                    if (el.aggregation_type === 'none') {
                        columns.push(`${dateFmt} as "${el.display_name}"`);
                    } else if (el.aggregation_type === 'count_distinct') {
                        columns.push(`count(distinct ${dateFmt}) as "${el.display_name}"`);
                    } else {
                        columns.push(`${el.aggregation_type}(${dateFmt}) as "${el.display_name}"`);
                    }
                } else if (el.column_type === 'coordinate') {
                    if (el.aggregation_type === 'none') {
                        columns.push(`${el.SQLexpression} as "${el.display_name}"`);
                    } else if (el.aggregation_type === 'count_distinct') {
                        columns.push(`count(distinct ${el.SQLexpression}) as "${el.display_name}"`);
                    } else {
                        columns.push(`${el.aggregation_type}(${el.SQLexpression}) as "${el.display_name}"`);
                    }
                }
                // GROUP BY for computed columns
                if (el.column_type === 'date') {
                    grouping.push(this.duckdbDate(el.SQLexpression, el.format));
                } else if (el.aggregation_type === 'none' && el.column_type !== 'numeric') {
                    grouping.push(`(${el.SQLexpression})`);
                }

            // ── Regular columns ───────────────────────────────────────────────
            } else {
                if (el.aggregation_type !== 'none') {
                    if (el.aggregation_type === 'count_distinct') {
                        // count returns BIGINT → postfix cast is safe here
                        columns.push(`ROUND(count(distinct ${table_column})::numeric ${whatIfExpression}, ${el.minimumFractionDigits}) as "${el.display_name}"`);
                    } else {
                        // Cast inside the aggregation to avoid DuckDB's postfix-cast-after-agg limitation.
                        // count() works on any type — skip the ::numeric cast to avoid errors on text columns.
                        const aggExpr = el.aggregation_type === 'count'
                            ? `${table_column}`
                            : `${table_column}::numeric`;
                        columns.push(`ROUND(${el.aggregation_type}(${aggExpr}) ${whatIfExpression}, ${el.minimumFractionDigits}) as "${el.display_name}"`);
                    }
                } else {
                    if (el.column_type === 'numeric') {
                        columns.push(`ROUND(${table_column}::numeric, ${el.minimumFractionDigits}) ${whatIfExpression} as "${el.display_name}"`);
                    } else if (el.column_type === 'date') {
                        columns.push(`${this.duckdbDate(table_column, el.format)} as "${el.display_name}"`);
                    } else {
                        columns.push(`${table_column} as "${el.display_name}"`);
                    }
                    // GROUP BY for non-aggregated regular columns
                    if (el.column_type === 'date') {
                        grouping.push(this.duckdbDate(table_column, el.format));
                    } else {
                        // A lone numeric column without aggregation is not added to GROUP BY
                        if (this.queryTODO.fields.length > 1 || el.column_type !== 'numeric' ||
                            (el.column_type === 'numeric' && el.aggregation_type === 'none')) {
                            grouping.push(`${table_column}`);
                        }
                    }
                }
            }
        });

        return [columns, grouping];
    }

    // ── Schema & permissions ─────────────────────────────────────────────────

    buildPermissionJoin(origin: string, joinStrings: string[], permissions: any[], schema?: string) {
        if (schema) {
            origin = `${schema}.${origin}`;
        }
        let joinString = `( SELECT ${origin}.* from ${origin} `;
        joinString += joinStrings.join(' ') + ' where ';
        permissions.forEach(permission => {
            joinString += ` ${this.filterToString(permission)} and `;
        });
        return `${joinString.slice(0, joinString.lastIndexOf(' and '))} )  `;
    }

    sqlQuery(query: string, filters: any[], filterMarks: string[]): string {
        const colsInFilters = [];
        filters.forEach((filter, i) => {
            let col = filter.type === 'in'
                ? filter.string.slice(filter.string.indexOf('.') + 1, filter.string.indexOf(' in ')).replace(/"/g, '')
                : filter.string.slice(filter.string.indexOf('.') + 1, filter.string.indexOf('between')).replace(/"/g, '');
            colsInFilters.push({ col: col, index: i });
        });

        filterMarks.forEach((mark) => {
            let subs = mark.split('').slice(filterMarks[0].indexOf('{') + 1, mark.indexOf('}') - mark.indexOf('$')).join('');
            let col = subs.slice(subs.indexOf('.') + 1);
            let arr = [];
            if (!colsInFilters.map(f => f.col.toUpperCase().trim()).includes(col.toUpperCase().trim())) {
                arr.push(`${subs}::varchar ilike '%'`);
            } else {
                const index = colsInFilters.filter(f => f.col.toUpperCase().trim() === col.toUpperCase().trim()).map(f => f.index)[0];
                arr = filters[index].string.split(' ');
                arr[0] = subs;
            }
            query = query.replace(mark, arr.join(' '));
        });

        return query;
    }

    parseSchema(tables: string[], schema: string) {
        const output = [];
        const reg = new RegExp(/[".\[\]]/, 'g');
        tables.forEach(table => {
            table = table.replace(schema, '');
            table = table.replace(reg, '');
            output.push(table);
        });
        return output;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private cleanViewString(query: string) {
        const index = query.lastIndexOf('as');
        query = query.slice(0, index) + `as "${query.slice(index + 3)}" `;
        return query;
    }
}
