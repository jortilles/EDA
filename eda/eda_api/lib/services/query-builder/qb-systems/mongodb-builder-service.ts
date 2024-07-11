import { QueryBuilderService } from '../query-builder.service';
import * as _ from 'lodash';


export class MongoDBBuilderService extends QueryBuilderService {



    public builder(): any {
        try {
            const collectionName = this.queryTODO.fields[0].table_id;
            const fields = this.queryTODO.fields;

            const simple = this.queryTODO.simple;
            const joinType = this.queryTODO.joinType;
            const queryLimit = this.queryTODO.queryLimit;
            const forSelector = this.queryTODO.forSelector;
            const columns = [];

            const mongoQuery: any = {
                collectionName,
                criteria: {},
                columns: [],
                aggregations: {},
                filters: [],
                dateFormat: {},
                dateProjection: {}
            };

            fields.forEach((column: any) => {
                mongoQuery.columns.push(column.column_name);
                
                if (column.column_type == 'date') {
                    mongoQuery.dateFormat[column.column_name] = column.format || 'No';
                }
                // mongoQuery.columns.push(column.column_name);

                // let newColumnObject = {
                //     column_name: column.column_name ?? null,
                //     display_name: column.display_name ?? null,
                //     column_type: column.column_type ?? 'text',
                //     old_column_type: column.old_column_type ?? 'text',
                //     aggregation_type: column.aggregation_type ?? 'none',
                //     ordenation_type: column.ordenation_type ?? 'No',
                //     order: column.order ?? 1,
                //     column_granted_roles: column.column_granted_roles ?? [],
                //     row_granted_roles: column.row_granted_roles ?? [],
                //     tableCount: column.tableCount ?? 0,
                //     minimumFractionDigits: column.minimumFractionDigits ?? 0,
                //     whatif_column: column.whatif_column ?? false
                // }

            });

            mongoQuery.filters = this.getFilters();

            mongoQuery.havingFilters = this.getHavingFilters();

            const pipeline = this.getPipeline();
            mongoQuery.pipeline = pipeline?.pipeline;
            mongoQuery.aggregations = pipeline?.aggregations;
            mongoQuery.dateProjection = pipeline?.dateProjection;

            return mongoQuery;
            console.log("Info de la consulta: ", this.queryTODO);
            //console.log("Modelo de la consulta o AKA conexión: ", this.dataModel);
        } catch (err) {
            console.error('Error:', err);
            throw err;
        }
    }

    public getFilters() {
        const columns = this.queryTODO.fields;

        const filters = this.queryTODO.filters.filter((f: any) => {
            const column = columns.find((c: any) => f.filter_table == c.table_id && f.filter_column == c.column_name);
            f.column_type = column?.column_type || 'text';

            if (column && column?.aggregation_type && column?.aggregation_type === 'none') {
                return true;
            } else {
                return false;
            }
        });

        if (filters.length > 0) {
            return this.formatFilter(filters);
        } else {
            return null;
        }

    }

    public getHavingFilters() {
        const columns = this.queryTODO.fields;
        //TO HAVING CLAUSE 
        const havingFilters = this.queryTODO.filters.filter((f: any) => {
            const column = columns.find((c: any) => c.table_id === f.filter_table && f.filter_column === c.column_name);
            f.column_type = column?.column_type || 'text';

            if (column && column?.column_type == 'numeric' && column?.aggregation_type !== 'none') {
                return true;
            } else {
                return false;
            }
        });

        if (havingFilters.length > 0) {
            return this.formatFilter(havingFilters);
        } else {
            return null;
        }
    }
    

    public formatFilter(filters: any[]) {
        const formatedFilter = {
            $and: []
        };

        for (const filter of filters) {
            // if (['=', '!=', '>', '<', '<=', '>=', 'like', 'not_like'].includes(filter)) return 0;
            // else if (['not_in', 'in'].includes(filter)) return 1;
            // else if (filter === 'between') return 2;
            // else if (filter === 'not_null') return 3;
            
            const filterType = filter.filter_type;
            const columnType = filter.column_type;
            
            if (!['not_null'].includes(filterType)) {

                const value = filter.filter_elements[0].value1;
                const firstValue = columnType == 'numeric' ? Number(value[0]) : value[0];

                if (filterType == '=') {
                    formatedFilter['$and'].push({ [filter.filter_column]: firstValue })
                } else if (filterType == '!=') {
                    formatedFilter['$and'].push({ [filter.filter_column]: { $ne: firstValue } });
                } else if (filterType == '>') {
                    formatedFilter['$and'].push({ [filter.filter_column]: { $gt: firstValue } });
                } else if (filterType == '<') {
                    formatedFilter['$and'].push({ [filter.filter_column]: { $lt: firstValue } });
                } else if (filterType == '>=') {
                    formatedFilter['$and'].push({ [filter.filter_column]: { $gte: firstValue } });
                } else if (filterType == '<=') {
                    formatedFilter['$and'].push({ [filter.filter_column]: { $lte: firstValue } });
                } else if (filterType == 'like') {
                    formatedFilter['$and'].push({ [filter.filter_column]: { $regex: firstValue, $options: 'i' } });
                } else if (filterType == 'not_like') {
                    formatedFilter['$and'].push({ [filter.filter_column]: { $not: { $regex: firstValue, $options: 'i' } } });
                }

                if (filterType == 'in') {
                    formatedFilter['$and'].push({ [filter.filter_column]: { $in: value } });
                } else if (filterType == 'not_in') {
                    formatedFilter['$and'].push({ [filter.filter_column]: { $not: { $in: value } } });
                }

                if (filterType == 'between') {
                    const value2 = filter.filter_elements[1].value2;
                    const secondValue = columnType == 'numeric' ? Number(value2[0]) : value2[0];

                    formatedFilter['$and'].push({ [filter.filter_column]: { $gte: firstValue, $lte: secondValue } });
                }

            } else {
                if (filterType == 'not_null') {
                    formatedFilter['$and'].push({ [filter.filter_column]: { $exists: true, $ne: null } });
                }
            }

        }

        return formatedFilter;
    }

    public getPipeline() {
        const fields = this.queryTODO.fields;
        const pipeline = {
            $group: {
                _id: {}
            }
        };

        const agg = {
            'sum': '$sum',
            'avg': '$avg',
            'max': '$max',
            'min': '$min',
            'count': '$sum',
            'count_distinct': '$addToSet',
            'none': '',
        };

        const aggregations = {};
        const dateProjection = {};
        for (const column of fields) {
            if (column.aggregation_type !== 'none') {

                if (column.aggregation_type == 'count') {
                    pipeline['$group'][column.column_name] = { '$sum': 1 };
                } else {
                    pipeline['$group'][column.column_name] = { [agg[column.aggregation_type]]: `$${column.column_name}` };
                }

                aggregations[column.aggregation_type] = aggregations[column.aggregation_type] || [];
                aggregations[column.aggregation_type].push(column.column_name);
            } else {

                if (column.column_type === 'date') {
                    const format = column.format;

                    if (format == 'year') {
                        // pipeline['$group'][column.column_name] = { format: "%Y", date: `$${column.column_name}` };
                        pipeline['$group']._id[column.column_name] = `$${column.column_name}`;
                        dateProjection[column.column_name] = { $year: `$${column.column_name}` };
                    } else if (format == 'No') {
                        dateProjection[column.column_name] = { format: "%Y-%m-%d", date: `$${column.column_name}` }; 
                    }

                } else if (fields.length > 1 || column.column_type != 'numeric') {
                    pipeline['$group']._id[column.column_name] = `$${column.column_name}`;
                }
            }
        }

        // if (Object.keys(aggregations).length > 0) {
            return {
                aggregations,
                dateProjection,
                pipeline: [pipeline]
            }
        // } else {
        //     return undefined;
        // }
    }

    public sqlBuilder(userQuery: any, filters: any[]): string {
        let sql_query = '';

        return sql_query;

    }


    public normalQuery(columns: string[], origin: string, dest: any[], joinTree: any[], grouping: any[], filters: any[], havingFilters: any[],
        tables: Array<any>, limit: number, joinType: string, valueListJoins: Array<any>, schema: string, database: string, forSelector: any) {

    }

    public xgetFilters(filters) {
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
                if (f.filter_type === 'not_null') {
                    filtersString += '\nand ' + this.filterToString(f);
                } else {
                    let nullValueIndex = f.filter_elements[0].value1.indexOf(null);
                    if (nullValueIndex != - 1) {
                        if (f.filter_elements[0].value1.length === 1) {
                            /* puedo haber escogido un nulo en la igualdad */
                            if (f.filter_type == '=') {
                                filtersString += `\nand ${colname}  is null `;
                            } else {
                                filtersString += `\nand ${colname}  is not null `;
                            }
                        } else {
                            if (f.filter_type == '=') {
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

            /**Allow filter ranges */
            filtersString = this.mergeFilterStrings(filtersString, equalfilters);
            return filtersString;
        } else {
            return '';
        }
    }

    public getJoins(joinTree: any[], dest: any[], tables: Array<any>, joinType: string, valueListJoins: Array<any>, schema: string) {
        if (schema === 'null' || schema === '') {
            schema = 'public';
        }

        let joins = [];
        let joined = [];
        let joinString = [];
        let myJoin = joinType;

        for (let i = 0; i < dest.length; i++) {
            let elem = joinTree.find(n => n.name === dest[i]);
            let tmp = [];
            elem.path.forEach(parent => {
                tmp.push(parent);
            });
            tmp.push(elem.name);
            joins.push(tmp);
        }

        joins.forEach(e => {
            for (let i = 0; i < e.length - 1; i++) {
                let j = i + 1;
                if (!joined.includes(e[j])) {

                    let joinColumns = this.findJoinColumns(e[j], e[i]);

                    /**T can be a table or a custom view, if custom view has a query  */
                    let t = tables.filter(table => table.name === e[j]).map(table => { return table.query ? this.cleanViewString(table.query) : table.name })[0];
                    if (valueListJoins.includes(e[j])) {
                        myJoin = 'left'; // Si es una tabla que ve del multivaluelist aleshores els joins son left per que la consulta tingui sentit.
                    } else {
                        myJoin = joinType;
                    }
                    //Version compatibility string//array
                    if (typeof joinColumns[0] === 'string') {
                        joinString.push(` ${myJoin} join "${schema}"."${t}" on "${schema}"."${e[j]}"."${joinColumns[1]}" = "${schema}"."${e[i]}"."${joinColumns[0]}"`);
                    }
                    else {

                        let join = ` ${myJoin} join "${schema}"."${t}" on`;

                        joinColumns[0].forEach((_, x) => {

                            join += `  "${schema}"."${e[j]}"."${joinColumns[1][x]}" =  "${schema}"."${e[i]}"."${joinColumns[0][x]}" and`

                        });

                        join = join.slice(0, join.length - 'and'.length);
                        joinString.push(join);

                    }
                    joined.push(e[j]);
                }
            }
        });

        return joinString;
    }

    public getSeparedColumns(origin: string, dest: string[]) {
        const columns = [];
        const grouping = [];

        this.queryTODO.fields.forEach(el => {
            el.order !== 0 && el.table_id !== origin && !dest.includes(el.table_id) ? dest.push(el.table_id) : false;

            const table_column = `"${el.table_id}"."${el.column_name}"`;

            let whatIfExpression = '';
            if (el.whatif_column) whatIfExpression = `${el.whatif.operator} ${el.whatif.value}`;

            el.minimumFractionDigits = el.minimumFractionDigits || 0;

            // Aqui se manejan las columnas calculadas
            if (el.computed_column === 'computed') {
                if (el.column_type == 'text') {
                    columns.push(`  ${el.SQLexpression}  as "${el.display_name}"`);
                } else if (el.column_type == 'numeric') {
                    columns.push(` ROUND(  CAST( ${el.SQLexpression}  as numeric)  , ${el.minimumFractionDigits}) as "${el.display_name}"`);
                } else if (el.column_type == 'date') {
                    columns.push(`  ${el.SQLexpression}  as "${el.display_name}"`);
                } else if (el.column_type == 'coordinate') {
                    columns.push(`  ${el.SQLexpression}  as "${el.display_name}"`);
                }
                // GROUP BY
                if (el.format) {
                    if (_.isEqual(el.format, 'year')) {
                        grouping.push(`to_char(" ${el.SQLexpression} ", 'YYYY')`);
                    } else if (_.isEqual(el.format, 'quarter')) {
                        grouping.push(`to_char(" ${el.SQLexpression} ", 'YYYY-"Q"Q') `);
                    } else if (_.isEqual(el.format, 'month')) {
                        grouping.push(`to_char(" ${el.SQLexpression} ", 'YYYY-MM')`);
                    } else if (_.isEqual(el.format, 'week')) {
                        grouping.push(`to_char(" ${el.SQLexpression} ", 'IYYY-IW')`);
                    } else if (_.isEqual(el.format, 'day')) {
                        grouping.push(`to_char(" ${el.SQLexpression} ", 'YYYY-MM-DD')`);
                    } else if (_.isEqual(el.format, 'day_hour')) {
                        grouping.push(`to_char(" ${el.SQLexpression} ", 'YYYY-MM-DD HH')  `);
                    } else if (_.isEqual(el.format, 'day_hour_minute')) {
                        grouping.push(`to_char(" ${el.SQLexpression} ", 'YYYY-MM-DD HH:MI')  `);
                    } else if (_.isEqual(el.format, 'timestamp')) {
                        grouping.push(`to_char(" ${el.SQLexpression} ", 'YYYY-MM-DD HH:MI:SS')`);
                    } else if (_.isEqual(el.format, 'week_day')) {
                        grouping.push(`to_char(" ${el.SQLexpression} ", 'ID')`);
                    } else if (_.isEqual(el.format, 'No')) {
                        grouping.push(`" ${el.SQLexpression} `);
                    }
                } else {
                    if (el.column_type != 'numeric') { // Computed colums require agrregations for numeric
                        grouping.push(` ${el.SQLexpression} `);
                    }
                }

            } else {

                if (el.aggregation_type !== 'none') {

                    if (el.aggregation_type === 'count_distinct') {
                        columns.push(`ROUND(count(distinct ${table_column})::numeric, ${el.minimumFractionDigits})::float ${whatIfExpression} as "${el.display_name}"`);
                    } else {
                        columns.push(`ROUND(${el.aggregation_type}(${table_column})::numeric, ${el.minimumFractionDigits})::float ${whatIfExpression} as "${el.display_name}"`);
                    }


                } else {
                    if (el.column_type === 'numeric') {
                        columns.push(`ROUND(${table_column}::numeric, ${el.minimumFractionDigits})::float ${whatIfExpression} as "${el.display_name}"`);
                    } else if (el.column_type === 'date') {
                        if (el.format) {
                            if (_.isEqual(el.format, 'year')) {
                                columns.push(`to_char(${table_column}, 'YYYY') as "${el.display_name}"`);
                            } else if (_.isEqual(el.format, 'quarter')) {
                                columns.push(`to_char(${table_column}, 'YYYY-"Q"Q') as "${el.display_name}"`);
                            } else if (_.isEqual(el.format, 'month')) {
                                columns.push(`to_char(${table_column}, 'YYYY-MM') as "${el.display_name}"`);
                            } else if (_.isEqual(el.format, 'week')) {
                                columns.push(`to_char(${table_column}, 'IYYY-IW') as "${el.display_name}"`);
                            } else if (_.isEqual(el.format, 'day')) {
                                columns.push(`to_char(${table_column}, 'YYYY-MM-DD') as "${el.display_name}"`);
                            } else if (_.isEqual(el.format, 'day_hour')) {
                                columns.push(`to_char(${table_column}, 'YYYY-MM-DD HH') as "${el.display_name}"`);
                            } else if (_.isEqual(el.format, 'day_hour_minute')) {
                                columns.push(`to_char(${table_column}, 'YYYY-MM-DD HH:MI') as "${el.display_name}"`);
                            } else if (_.isEqual(el.format, 'timestamp')) {
                                columns.push(`to_char(${table_column}, 'YYYY-MM-DD HH:MI:SS') as "${el.display_name}"`);
                            } else if (_.isEqual(el.format, 'week_day')) {
                                columns.push(`to_char(${table_column}, 'ID') as "${el.display_name}"`);
                            } else if (_.isEqual(el.format, 'No')) {
                                columns.push(`to_char(${table_column}, 'YYYY-MM-DD') as "${el.display_name}"`);
                            }
                        } else {
                            columns.push(`to_char(${table_column}, 'YYYY-MM-DD') as "${el.display_name}"`);
                        }
                    } else {
                        columns.push(`${table_column} as "${el.display_name}"`);
                    }
                    // GROUP BY
                    if (el.format) {
                        if (_.isEqual(el.format, 'year')) {
                            grouping.push(`to_char(${table_column}, 'YYYY')`);
                        } else if (_.isEqual(el.format, 'quarter')) {
                            grouping.push(`to_char(${table_column}, 'YYYY-"Q"Q') `);
                        } else if (_.isEqual(el.format, 'month')) {
                            grouping.push(`to_char(${table_column}, 'YYYY-MM')`);
                        } else if (_.isEqual(el.format, 'week')) {
                            grouping.push(`to_char(${table_column}, 'IYYY-IW')`);
                        } else if (_.isEqual(el.format, 'day')) {
                            grouping.push(`to_char(${table_column}, 'YYYY-MM-DD')`);
                        } else if (_.isEqual(el.format, 'day_hour')) {
                            grouping.push(`to_char(${table_column}, 'YYYY-MM-DD HH')  `);
                        } else if (_.isEqual(el.format, 'day_hour_minute')) {
                            grouping.push(`to_char(${table_column}, 'YYYY-MM-DD HH:MI')  `);
                        } else if (_.isEqual(el.format, 'timestamp')) {
                            grouping.push(`to_char(${table_column}, 'YYYY-MM-DD HH:MI:SS')`);
                        } else if (_.isEqual(el.format, 'week_day')) {
                            grouping.push(`to_char(${table_column}, 'ID')`);
                        } else if (_.isEqual(el.format, 'No')) {
                            grouping.push(`${table_column}`);
                        }
                    } else {
                        //  Si no se agrega
                        if (this.queryTODO.fields.length > 1 || el.column_type != 'numeric') {
                            grouping.push(`${table_column}`);
                        }
                    }
                }
            }
        });
        return [columns, grouping];
    }



    /**
     * 
     * @param filter 
     * @returns filter to string.  
     */
    public filterToString(filter: any) {

        const column = this.findColumn(filter.filter_table, filter.filter_column);
        if (!column.hasOwnProperty('minimumFractionDigits')) {
            column.minimumFractionDigits = 0;
        }
        const colname = this.getFilterColname(column);
        let colType = column.column_type;

        switch (this.setFilterType(filter.filter_type)) {
            case 0:
                if (filter.filter_type === '!=') { filter.filter_type = '<>' }
                if (filter.filter_type === 'like') {
                    return `${colname}  ${filter.filter_type} '%${filter.filter_elements[0].value1}%' `;
                }
                if (filter.filter_type === 'not_like') {
                    filter.filter_type = 'not like'
                    return `${colname}  ${filter.filter_type} '%${filter.filter_elements[0].value1}%' `;
                }
                return `${colname}  ${filter.filter_type} ${this.processFilter(filter.filter_elements[0].value1, colType)} `;
            case 1:
                if (filter.filter_type === 'not_in') { filter.filter_type = 'not in' }
                return `${colname}  ${filter.filter_type} (${this.processFilter(filter.filter_elements[0].value1, colType)}) `;
            case 2:
                return `${colname}  ${filter.filter_type} 
                        ${this.processFilter(filter.filter_elements[0].value1, colType)} and ${this.processFilterEndRange(filter.filter_elements[1].value2, colType)}`;
            case 3:
                return `${colname} is not null`;
        }
    }

    /**
     * 
     * @param column 
     * @returns coumn name in string mode for filtering. 
     */
    public getFilterColname(column: any) {
        let colname: String;
        if (column.computed_column == 'no' || !column.hasOwnProperty('computed_column')) {
            colname = `"${column.table_id}"."${column.column_name}"`;
        } else {
            if (column.column_type == 'numeric') {
                colname = `ROUND(  CAST( ${column.SQLexpression}  as numeric)  , ${column.minimumFractionDigits})`;
            } else {
                colname = `  ${column.SQLexpression}  `;
            }
        }
        return colname;
    }


    /**
   * 
   * @param filter 
   * @returns clausula having en un string.  
   */
    public xgetHavingFilters(filters) {
        if (filters.length) {
            let filtersString = `\nhaving 1=1 `;
            filters.forEach(f => {
                const column = this.findHavingColumn(f.filter_table, f.filter_column);
                const colname = this.getHavingColname(column);

                if (f.filter_type === 'not_null') {
                    filtersString += `\nand ${colname}  is not null `;
                } else {
                    /* Control de nulos... se genera la consutla de forma diferente */
                    let nullValueIndex = f.filter_elements[0].value1.indexOf(null);
                    if (nullValueIndex != - 1) {
                        if (f.filter_elements[0].value1.length === 1) {
                            /* puedo haber escogido un nulo en la igualdad */
                            if (f.filter_type == '=') {
                                filtersString += `\nand ${colname}  is null `;
                            } else {
                                filtersString += `\nand ${colname}  is not null `;
                            }
                        } else {
                            if (f.filter_type == '=') {
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

    /**
     * 
     * @param column 
     * @returns coumn name in string mode for having. 
     */
    public getHavingColname(column: any) {
        let colname: String;
        if (column.computed_column === 'no' || !column.hasOwnProperty('computed_column')) {
            colname = `ROUND( ${column.aggregation_type} ("${column.table_id}"."${column.column_name}")::numeric, ${column.minimumFractionDigits})::float`;
        } else {
            if (column.column_type == 'numeric') {
                colname = `ROUND(   ${column.SQLexpression}  as numeric)  , ${column.minimumFractionDigits})::float`;
            } else {
                colname = `  ${column.SQLexpression}  `;
            }
        }
        return colname;
    }


    /**
     * 
     * @param filter 
     * @returns having filters  to string. 
     */
    public havingToString(filter: any) {
        const column = this.findHavingColumn(filter.filter_table, filter.filter_column);

        if (!column.hasOwnProperty('minimumFractionDigits')) {
            column.minimumFractionDigits = 0;
        }
        const colname = this.getHavingColname(column);

        let colType = column.column_type;

        switch (this.setFilterType(filter.filter_type)) {
            case 0:
                if (filter.filter_type === '!=') { filter.filter_type = '<>' }
                if (filter.filter_type === 'like') {
                    return `${colname}  ${filter.filter_type} '%${filter.filter_elements[0].value1}%' `;
                }
                if (filter.filter_type === 'not_like') {
                    filter.filter_type = 'not like'
                    return `${colname}  ${filter.filter_type} '%${filter.filter_elements[0].value1}%' `;
                }
                return `${colname}  ${filter.filter_type} ${this.processFilter(filter.filter_elements[0].value1, colType)} `;
            case 1:
                if (filter.filter_type === 'not_in') { filter.filter_type = 'not in' }
                return `${colname}  ${filter.filter_type} (${this.processFilter(filter.filter_elements[0].value1, colType)}) `;
            case 2:
                return `${colname}  ${filter.filter_type} 
                        ${this.processFilter(filter.filter_elements[0].value1, colType)} and ${this.processFilterEndRange(filter.filter_elements[1].value2, colType)}`;
            case 3:
                return `${colname} is not null`;
        }
    }


    /**
     * 
     * @param filter  filter element
     * @param columnType  column  type
     * @returns firght side of the filter
     */

    public processFilter(filter: any, columnType: string) {
        filter = filter.map(elem => {
            if (elem === null || elem === undefined) return 'ihatenulos';
            else return elem;
        });
        if (!Array.isArray(filter)) {
            switch (columnType) {
                case 'text': return `'${filter}'`;
                //case 'text': return `'${filter}'`;
                case 'numeric': return filter;
                case 'date': return `to_date('${filter}','YYYY-MM-DD')`
            }
        } else {
            let str = '';
            filter.forEach(value => {
                const tail = columnType === 'date'
                    ? `to_date('${value}','YYYY-MM-DD')`
                    : columnType === 'numeric' ? value : `'${String(value).replace(/'/g, "''")}'`;
                str = str + tail + ','
            });

            // En el cas dels filtres de seguretat si l'usuari no pot veure res....
            filter.forEach(f => {
                if (f == '(x => None)') {
                    switch (columnType) {
                        case 'text': str = `'(x => None)'  `; break;
                        case 'numeric': str = 'null  '; break;
                        case 'date': str = `to_date('4092-01-01','YYYY-MM-DD')  `; break;
                    }
                }
            });

            return str.substring(0, str.length - 1);
        }
    }



    /** this funciton is done to get the end of a date time range 2010-01-01 23:59:59 */
    public processFilterEndRange(filter: any, columnType: string) {
        filter = filter.map(elem => {
            if (elem === null || elem === undefined) return 'ihatenulos';
            else return elem;
        });
        if (!Array.isArray(filter)) {
            switch (columnType) {
                case 'text': return `'${filter}'`;
                //case 'text': return `'${filter}'`;
                case 'numeric': return filter;
                case 'date': return `to_timestamp('${filter} 23:59:59','YYYY-MM-DD  HH24:MI:SS')`
            }
        } else {
            let str = '';
            filter.forEach(value => {
                const tail = columnType === 'date'
                    ? `to_timestamp('${value} 23:59:59','YYYY-MM-DD  HH24:MI:SS')`
                    : columnType === 'numeric' ? value : `'${String(value).replace(/'/g, "''")}'`;
                str = str + tail + ','
            });
            return str.substring(0, str.length - 1);
        }
    }



    buildPermissionJoin(origin: string, joinStrings: string[], permissions: any[], schema?: string) {
        if (schema) {
            origin = `${schema}.${origin}`;
        }
        let joinString = `( SELECT ${origin}.* from ${origin} `;
        joinString += joinStrings.join(' ') + ' where ';
        permissions.forEach(permission => {
            joinString += ` ${this.filterToString(permission)} and `
        });
        return `${joinString.slice(0, joinString.lastIndexOf(' and '))} )  `;
    }


    sqlQuery(query: string, filters: any[], filterMarks: string[]): string {
        //Get cols present in filters
        const colsInFilters = [];

        filters.forEach((filter, i) => {
            let col = filter.type === 'in' ?
                filter.string.slice(filter.string.indexOf('.') + 1, filter.string.indexOf(' in ')).replace(/"/g, '') :
                filter.string.slice(filter.string.indexOf('.') + 1, filter.string.indexOf('between')).replace(/"/g, '');
            colsInFilters.push({ col: col, index: i });
        });

        filterMarks.forEach((mark, i) => {

            let subs = mark.split('').slice(filterMarks[0].indexOf('{') + 1, mark.indexOf('}') - mark.indexOf('$')).join('');
            let col = subs.slice(subs.indexOf('.') + 1);
            let arr = [];

            if (!colsInFilters.map(f => f.col.toUpperCase().trim()).includes(col.toUpperCase().trim())) {

                arr.push(`${subs}::varchar like '%'`);

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
        const reg = new RegExp(/[".\[\]]/, "g");
        tables.forEach(table => {
            table = table.replace(schema, '')
            table = table.replace(reg, '')
            output.push(table);

        });
        return output;
    }

    /* Se pone el alias entre comillas para revitar errores de sintaxis*/
    private cleanViewString(query: string) {
        const index = query.lastIndexOf('as');
        query = query.slice(0, index) + `as "${query.slice(index + 3)}" `;
        return query;
    }
}


