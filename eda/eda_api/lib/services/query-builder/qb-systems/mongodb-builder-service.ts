import * as _ from 'lodash';


export class MongoDBBuilderService {

    public queryTODO: any;
    public dataModel: any;
    public user: string;
    public limit: number;

    constructor(queryTODO: any, dataModel: any, user: any, limit: number = 100) {
        this.queryTODO = queryTODO;
        this.dataModel = dataModel;
        this.user = user._id;
        this.limit = limit;
    }

    public builder(): any {
        try {
            const collectionName = this.queryTODO.fields[0].table_id;
            const fields = this.queryTODO.fields;

            const mongoQuery: any = {
                collectionName,
                criteria: {},
                columns: [],
                aggregations: {},
                filters: [],
                dateFormat: {},
                ordenationType: [],
                dateProjection: {}
            };

            fields.forEach((column: any) => {
                mongoQuery.columns.push(column.column_name);
                
                if (column.column_type == 'date') {
                    mongoQuery.dateFormat[column.column_name] = column.format || 'No';
                }
            });
            fields.forEach((column: any) => {
                if( ['Asc','Desc', 'No'].includes(  column.ordenation_type )){
                    mongoQuery.ordenationType.push({
                        column:column.column_name,
                        ordenationType: column.ordenation_type
                    });
                }else{ // Si no tengo ordenacion es para un filtro y quiero ordenarlo ascendentemente
                    mongoQuery.ordenationType.push({
                        column:column.column_name,
                        ordenationType: 'Asc'
                    });
                }
            });

            mongoQuery.filters = this.getFilters();

            mongoQuery.havingFilters = this.getHavingFilters();

            const pipeline = this.getPipeline();
            mongoQuery.pipeline = pipeline?.pipeline;
            mongoQuery.aggregations = pipeline?.aggregations;
            mongoQuery.dateProjection = pipeline?.dateProjection;

            return mongoQuery;
        } catch (err) {
            console.error('Error:', err);
            throw err;
        }
    }

    public getFilters() {
       
/*  Alex: Per que vas fer aixó?
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
        */

        if (this.queryTODO.filters.length > 0) {
            return this.formatFilter(this.queryTODO.filters);
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
                    const format = column.format || 'No';

                    if (format == 'year') {
                        pipeline['$group']._id[column.column_name] = `$${column.column_name}`;
                        dateProjection[column.column_name] = { $year: `$${column.column_name}` };
                    } else if (format == 'month') {
                        pipeline['$group']._id[column.column_name] = `$${column.column_name}`;
                        dateProjection[column.column_name] = { $dateToString: { format: "%Y-%m", date: `$${column.column_name}` } };
                    } else if (format == 'No') {
                        pipeline['$group']._id[column.column_name] = `$${column.column_name}`;
                        dateProjection[column.column_name] =  { $dateToString: { format: "%Y-%m-%d", date: `$${column.column_name}`  } }; //{ format: "%Y-%m-%d", date: `$${column.column_name}` }; 
                    }

                } else if (fields.length > 1 || column.column_type != 'numeric') {
                    pipeline['$group']._id[column.column_name] = `$${column.column_name}`;
                }
            }
        }

        return {
            aggregations,
            dateProjection,
            pipeline: [
                pipeline,
                {$limit: this.limit} // agregando limite
            ],

        }
    }

    public sqlBuilder(userQuery: any, filters: any[]): string {
        let sql_query = '';

        return sql_query;
    }


    public normalQuery(columns: string[], origin: string, dest: any[], joinTree: any[], grouping: any[], filters: any[], havingFilters: any[],
        tables: Array<any>, limit: number, joinType: string, valueListJoins: Array<any>, schema: string, database: string, forSelector: any) {

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

}


