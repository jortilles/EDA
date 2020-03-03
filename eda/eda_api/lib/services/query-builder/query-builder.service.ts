import * as _ from 'lodash';

export abstract class QueryBuilderService {
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

    abstract getFilters(filters);
    abstract getJoins(joinTree: any[], dest: any[]);
    abstract getSeparedColumns(origin: string, dest: string[]);
    abstract filterToString(filterObject:any);
    abstract processFilter(filter: any, columnType: string);
    abstract normalQuery(columns: string[], origin: string, dest: any[], joinTree: any[], grouping: any[]);

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

    public buildGraph() {
        const graph = [];
        this.tables.forEach(t => {
            const relations = [];
            t.relations.filter(r => r.visible !== false)
            .forEach(r => { relations.push(r.target_table) });
            graph.push({ name: t.table_name, rel: relations });
        });
        return graph;
    }

    public dijkstraAlgorithm(graph, origin, dest) {
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

    public simpleQuery(columns: string[], origin: string) {
        return `SELECT DISTINCT ${columns.join(', ')} \nFROM ${origin} `;
    }


    public getPermissions(userID, modelPermissions, modelTables, originTable) {
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

    public getUserPermissions(userID: string, modelPermissions: any[]) {
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
    public checkRelatedTables(dbModel, tableName) {
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
    public findRelationsRecursive(tables, table, vMap) {
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

    public findJoinColumns(tableA: string, tableB: string) {
    
        const table = this.tables.find(x => x.table_name === tableA);
        const source_column = table.relations.find(x => x.target_table === tableB).source_column;
        const target_column = table.relations.find(x => x.target_table === tableB).target_column;

        return [target_column, source_column];
    }
 

    public findColumnType(table: string, column: string) {
        const tmpTable = this.tables.find(t => t.table_name === table);
        return tmpTable.columns.find(c => c.column_name === column).column_type;
    }

    public setFilterType(filter: string) {
        if (['=', '!=', '>', '<', '<=', '>=', 'like'].includes(filter)) return 0;
        else if (['not_in', 'in'].includes(filter)) return 1;
        else if (filter === 'between') return 2;
        else if (filter === 'not_null') return 3;
    }

}
