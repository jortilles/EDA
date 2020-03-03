import * as _ from 'lodash';

export class QueryBuilderService {
    public query: any;
    public dataModel: any;
    public tables: any[];
    public queryTODO: any;
    public user: string;
    public permissions: any[];

    constructor(queryTODO: any, dataModel: any, user: string) {
        this.queryTODO = queryTODO;
        this.dataModel = dataModel;
        this.user = user;
        this.tables = dataModel.ds.model.tables;
    }

    public builder() {
        const graph = this.buildGraph();
        /* Agafem els noms de les taules, origen i destí (és arbitrari), les columnes i el tipus d'agregació per construïr la consulta */
        const origin = this.queryTODO.fields.find(x => x.order === 0).table_id;
        const dest = [];
        const filterTables = this.queryTODO.filters.map(filter => filter.filter_table);
        const modelPermissions = this.dataModel.ds.metadata.model_granted_roles;

   
        // Afegim a dest les taules dels filtres
        filterTables.forEach(table => {
            if (!dest.includes(table) && table !== origin) {
                dest.push(table);
            }
        });

        /** Check dels permisos de columna, si hi ha permisos es posen als filtres */
        this.permissions = this.getPermissions(this.user, modelPermissions, this.tables, origin);
    
        if (this.permissions.length > 0){
            this.permissions.forEach(permission => {
                if(!dest.includes(permission.filter_table) && permission.filter_table !== origin){
                    dest.push(permission.filter_table);
                }
            });
        }


        /** SEPAREM ENTRE AGGREGATION COLUMNS/GROUPING COLUMNS */
        const separedCols = this.getSeparedColumns(origin, dest);
        const columns = separedCols[0];
        const grouping = separedCols[1];

        /** ARBRE DELS JOINS A FER */
        const joinTree = this.dijkstraAlgorithm(graph, origin, dest.slice(0));

        if (this.queryTODO.simple) {
            this.query = this.simpleQuery(columns, origin);
            return this.query;
        } else {
            this.query = this.normalQuery(columns, origin, dest, joinTree, grouping);
            return this.query;
        }
    }

    private buildGraph() {
        const graph = [];
        this.tables.forEach(t => {
            const relations = [];
            t.relations.filter(r => r.visible !== false)
            .forEach(r => { relations.push(r.target_table) });
            graph.push({ name: t.table_name, rel: relations });
        });
        return graph;
    }

    private dijkstraAlgorithm(graph, origin, dest) {
        const not_visited = [];
        const v = [];

        graph.forEach(n => {
            if (n.name !== origin) {
                not_visited.push({ name: n.name, dist: Infinity, path: [] });
            } else {
                not_visited.push({ name: n.name, dist: 0, path: [] });
            }
        });

        while (not_visited.length > 0 && dest.length > 0) {
            //let min = { name: 'foo', dist: Infinity, path: [] };
            let min = not_visited[0];
            for (let i = 1; i < not_visited.length; i++) {
                if (min.dist > not_visited[i].dist) {
                    min = not_visited[i];
                }
            }

            let e = graph.filter(g => g.name === min.name)[0];
            for (let i = 0; i < e.rel.length; i++) {
                let elem = not_visited.filter(n => n.name === e.rel[i])[0];
                if (elem) {
                    if (elem.dist > min.dist + 1) {
                        elem.dist = min.dist + 1;
                        min.path.forEach(p => {
                            elem.path.push(p);
                        });
                        elem.path.push(min.name);

                    }
                }
            }
            v.push(min);

            let index = not_visited.indexOf(not_visited.find(x => x.name === min.name));
            if (index > -1) {
                not_visited.splice(index, 1);
            }

            dest.forEach(n => {
                if (v.indexOf(v.find(x => x.name === n)) > -1) {
                    dest.splice(dest.indexOf(n), 1);
                }
            })

        }
        return (v);
    }

    private simpleQuery(columns: string[], origin: string) {
        return `SELECT DISTINCT ${columns.join(', ')} \nFROM ${origin} `;
    }

    private normalQuery(columns: string[], origin: string, dest: any[], joinTree: any[], grouping: any[]) {

        let myQuery = `SELECT ${columns.join(', ')} \nFROM ${origin}`;

        const filters = this.queryTODO.filters;

        // JOINS
        const joinString = this.getJoins(joinTree, dest);

        joinString.forEach(x => {
            myQuery = myQuery + '\n' + x;
        });

        // WHERE
        myQuery += this.getFilters(filters);

        // GroupBy
        if (grouping.length > 0) {
            myQuery += '\ngroup by ' + grouping.join(', ');
        }

        // OrderBy
        const orderColumns = this.queryTODO.fields.map(col => {
            let out;

            if (col.ordenation_type !== 'No' && col.ordenation_type !== undefined) {
                out = `"${col.display_name}" ${col.ordenation_type}`
            } else {
                out = false;
            }

            return out;
        }).filter(e => e !== false);

        const order_columns_string = orderColumns.join(',');
        if (order_columns_string.length > 0) {
            myQuery = `${myQuery}\norder by ${order_columns_string}`;
        }

        return myQuery;
    }

    private getPermissions(userID, modelPermissions, modelTables, originTable) {
        const filters = [];
        const permissions = this.getUserPermissions(userID, modelPermissions);
        const relatedTables = this.checkRelatedTables(modelTables, originTable);

        let found = -1;
        if (relatedTables !== null  && permissions !== null) {
            permissions.forEach(permission => {
                found = relatedTables.findIndex((t: any) => t.table_name === permission.table);
                if (found >= 0 ){
                    let filter = {
                        filter_table : permission.table,
                        filter_column : permission.column,
                        filter_type : 'in',
                        filter_elements : [{value1: permission.value}]
                    };

                    filters.push(filter);
                    found = -1;
                }
            });
        }
        return filters;
    }

    private getFilters(filters) {
        if (this.permissions.length > 0) {
            this.permissions.forEach(permission => {filters.push(permission);});
        } 
        if (filters.length) {
            let filtersString = '\nwhere 1 = 1 ';
            filters.forEach(f => {
                if (f.filter_type === 'not_null') {
                    filtersString += '\nand ' + this.filterToString(f);
                } else {
                    let nullValueIndex = f.filter_elements[0].value1.indexOf(null);
                    if (nullValueIndex != - 1) {
                        if (f.filter_elements[0].value1.length === 1) {
                            filtersString += `\nand "${f.filter_table}"."${f.filter_column}"  is null `;
                        } else {
                            filtersString += `\nand (${this.filterToString(f)} or "${f.filter_table}"."${f.filter_column}"  is null) `;
                        }
                    } else {
                        filtersString += '\nand ' + this.filterToString(f);
                    }
                }
            });
            return  filtersString;
        } else {
            return '';
        }
    }

    private getJoins(joinTree: any[], dest: any[]) {
        
        let joins = [];
        let joined = [];
        let joinString = [];

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
                    joined.push(e[j]);
                    joinString.push(`inner join "${e[j]}" on "${e[j]}"."${joinColumns[1]}" = "${e[i]}"."${joinColumns[0]}"`);
                }
            }
        });

        return joinString;
    }

    private getSeparedColumns(origin: string, dest: string[]) {
        const columns = [];
        const grouping = [];

        this.queryTODO.fields.forEach(el => {
            el.order !== 0 && el.table_id !== origin && !dest.includes(el.table_id) ? dest.push(el.table_id) : false;

            if (el.aggregation_type !== 'none') {
                if (el.aggregation_type === 'count_distinct') {
                    columns.push(`trunc( count( distinct "${el.table_id}"."${el.column_name}")::numeric, 2)::float as "${el.display_name}"`);
                } else {
                    columns.push(`trunc(${el.aggregation_type}("${el.table_id}"."${el.column_name}")::numeric, 2)::float as "${el.display_name}"`);
                }
            } else {
                if (el.column_type === 'numeric') {
                    columns.push(`trunc("${el.table_id}"."${el.column_name}"::numeric, 2)::float as "${el.display_name}"`);
                } else if (el.column_type === 'date') {
                    if (el.format) {
                        if (_.isEqual(el.format, 'year')) {
                            columns.push(`to_char("${el.table_id}"."${el.column_name}", 'YYYY') as "${el.display_name}"`);
                        } else if (_.isEqual(el.format, 'month')) {
                            columns.push(`to_char("${el.table_id}"."${el.column_name}", 'MM') as "${el.display_name}"`);
                        } else if (_.isEqual(el.format, 'day')) {
                            columns.push(`to_char("${el.table_id}"."${el.column_name}", 'DD') as "${el.display_name}"`);
                        }
                    } else {
                        columns.push(`to_char("${el.table_id}"."${el.column_name}", 'YYYY-MM-DD') as "${el.display_name}"`);
                    }
                } else {
                    columns.push(`"${el.table_id}"."${el.column_name}" as "${el.display_name}"`);
                }

                // GROUP BY
                if (el.format) {
                    if (_.isEqual(el.format, 'year')) {
                        grouping.push(`to_char("${el.table_id}"."${el.column_name}", 'YYYY')`);
                    } else if (_.isEqual(el.format, 'month')) {
                        columns.push(`to_char("${el.table_id}"."${el.column_name}", 'MM')`);
                    } else if (_.isEqual(el.format, 'day')) {
                        columns.push(`to_char("${el.table_id}"."${el.column_name}", 'DD')`);
                    }
                } else {
                    grouping.push(`"${el.table_id}"."${el.column_name}"`);
                }
            }
        });
        return [columns, grouping];
    }

    private getUserPermissions(userID: string, modelPermissions: any[]) {
        const permissions = [];
        modelPermissions.forEach(permission => {
            if (permission.users[0] === userID) {
                permissions.push(permission);
            }
        });
        return permissions;
    }

    /**
     * Main function to check relations
     * @param dMbModel all tables from model
     * @param tablename  (string)
     * @return array with all related tables
     */
    private checkRelatedTables(dbModel, tableName) {
        const originTable = dbModel.filter(t => t.table_name === tableName)[0];
        const tablesMap = this.findRelationsRecursive(dbModel, originTable, new Map());
        return Array.from(tablesMap.values());
    }


    /**
     * recursive function to find all related tables to given table
     * @param tables all model's tables (with relations)
     * @param table  origin table
     * @param vMap   Map() to keep tracking visited nodes -> first call is just a new Map()
     */
    private findRelationsRecursive(tables, table, vMap) {
        vMap.set(table.table_name, table);
        table.relations.filter(r => r.visible !== false)
        .forEach(rel => {
            const newTable = tables.find(t => t.table_name === rel.target_table);
            if (!vMap.has(newTable.table_name)) {
                this.findRelationsRecursive(tables, newTable, vMap);
            }
        });
        return vMap;
    }

    private findJoinColumns(tableA: string, tableB: string) {
    
        const table = this.tables.find(x => x.table_name === tableA);
        const source_column = table.relations.find(x => x.target_table === tableB).source_column;
        const target_column = table.relations.find(x => x.target_table === tableB).target_column;

        return [target_column, source_column];
    }

    private filterToString(filterObject: any) {
        let colType = this.findColumnType(filterObject.filter_table, filterObject.filter_column);
        switch (this.setFilterType(filterObject.filter_type)) {
            case 0:
                if (filterObject.filter_type === '!=') { filterObject.filter_type = '<>' }
                if (filterObject.filter_type === 'like') {
                    return `"${filterObject.filter_table}"."${filterObject.filter_column}"  ${filterObject.filter_type} '%${filterObject.filter_elements[0].value1}%' `;
                }
                return `"${filterObject.filter_table}"."${filterObject.filter_column}"  ${filterObject.filter_type} ${this.processFilter(filterObject.filter_elements[0].value1, colType)} `;
            case 1:
                if (filterObject.filter_type === 'not_in') { filterObject.filter_type = 'not in' }
                return `"${filterObject.filter_table}"."${filterObject.filter_column}"  ${filterObject.filter_type} (${this.processFilter(filterObject.filter_elements[0].value1, colType)}) `;
            case 2:
                return `"${filterObject.filter_table}"."${filterObject.filter_column}"  ${filterObject.filter_type} 
                        ${this.processFilter(filterObject.filter_elements[0].value1, colType)} and ${this.processFilter(filterObject.filter_elements[1].value2, colType)}`;
            case 3:
                return `"${filterObject.filter_table}"."${filterObject.filter_column}" is not null`;
        }
    }

    private findColumnType(table: string, column: string) {
        const tmpTable = this.tables.find(t => t.table_name === table);
        return tmpTable.columns.find(c => c.column_name === column).column_type;
    }

    private setFilterType(filter: string) {
        if (['=', '!=', '>', '<', '<=', '>=', 'like'].includes(filter)) return 0;
        else if (['not_in', 'in'].includes(filter)) return 1;
        else if (filter === 'between') return 2;
        else if (filter === 'not_null') return 3;
    }

    private processFilter(filter: any, columnType: string) {
        filter = filter.map(elem => {
            if(elem === null || elem === undefined)  return 'ihatenulos';
            else return elem;
        });
        if (!Array.isArray(filter)) {
            switch (columnType) {
                case 'varchar': return `'${filter}'`;
                //case 'text': return `'${filter}'`;
                case 'numeric': return filter;
                case 'date': return `to_date('${filter}','YYYY-MM-DD')`
            }
        } else {
            let str = '';
            filter.forEach(value => {
                const tail = columnType === 'date'
                    ? `to_date('${value}','YYYY-MM-DD')`
                    : columnType === 'numeric' ? value : `'${value.replace(/'/g, "''")}'`;
                str = str + tail + ','
            });
            return str.substring(0, str.length - 1);
        }
    }

}
