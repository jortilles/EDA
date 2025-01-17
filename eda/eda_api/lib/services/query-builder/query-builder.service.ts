import * as _ from 'lodash';
 /*SDA CUSTOM*/ import * as custom from  '../custom/custom' ;
class TreeNode {
    public value: string;
    public child: Array<TreeNode>
    constructor(value) {
        this.value = value;
        this.child = [];
    }
}


export abstract class QueryBuilderService {
    public query: any;
    public dataModel: any;
    public tables: any[];
    public queryTODO: any;
    public user: string;
    public usercode: string;
    public groups: Array<string> = [];
    public permissions: any[];

    constructor(queryTODO: any, dataModel: any, user: any) {
        this.queryTODO = queryTODO;
        this.dataModel = dataModel;
        this.user = user._id;
        this.usercode = user.email;
        this.groups = user.role;
        this.tables = dataModel.ds.model.tables;
    }

    abstract getFilters(filters, type: string, pTable: string);
    abstract getJoins(joinTree: any[], dest: any[], tables: Array<any>, 
        joinType:string, valueListJoins:Array<any>, schema?: string, database?: string);
    abstract getSeparedColumns(origin: string, dest: string[]);
    abstract filterToString(filterObject: any);
    abstract havingToString(filterObject: any);
    abstract processFilter(filter: any, columnType: string);
    abstract normalQuery(columns: string[], origin: string, dest: any[], joinTree: any[],
        grouping: any[], filters: any[], havingFilters: any[], tables: Array<any>, limit: number, 
        joinType: string,valueListJoins:any[], Schema?: string, database?: string, forSelector?: any );
    abstract sqlQuery(query: string, filters: any[], filterMarks: string[]): string;
    abstract buildPermissionJoin(origin: string, join: string[], permissions: any[], schema?: string);
    abstract parseSchema(tables: string[], schema?: string, database?: string);

    public builder() {

        let graph = this.buildGraph();
        /* Agafem els noms de les taules, origen i destí (és arbitrari), les columnes i el tipus d'agregació per construïr la consulta */
        let origin = this.queryTODO.rootTable || this.queryTODO.fields.find(x => x.order === 0).table_id;
        let dest = [];
        const valueListList = [];
        const modelPermissions = this.dataModel.ds.metadata.model_granted_roles;

         this.permissions = this.getTreePermissions(modelPermissions,  this.queryTODO);
        
        // SI USUARIO ES ADMIN VACIAR EL ARRAY PERMISSIONS
        
        if (this.groups.includes("135792467811111111111110")) {
            this.permissions = [];
        }
        /** joins per els value list */
        let valueListJoins = [];

        //console.log(this.queryTODO);

        if (!this.queryTODO.queryMode || this.queryTODO.queryMode == 'EDA') {
            /** Reviso si cap columna de la  consulta es un multivalueliest..... */
            this.queryTODO.fields.forEach( e=>{
                if( e.valueListSource ){
                    valueListList.push(JSON.parse(JSON.stringify(e)));
                        e.table_id =  e.valueListSource.target_table;
                        e.column_name = e.valueListSource.target_description_column;
                    if (!dest.includes( e.valueListSource.target_table) &&  e.valueListSource.target_table !== origin) {
                        dest.push( e.valueListSource.target_table);
                    }
                }
            })

            /** Reviso si cap FILTRE de la  consulta es un multivalueliest.....  */
            this.queryTODO.filters.forEach(e=>{
                if(e.valueListSource){
                    e.table_id = e.filter_table;
                    e.column_name = e.filter_column;
                    valueListList.push(JSON.parse(JSON.stringify(e)));
                    if (!dest.includes(e.valueListSource.target_table) &&  e.valueListSource.target_table !== origin) {
                        dest.push(e.valueListSource.target_table);
                    }
                }
            })

            /** revisió dels filtres per si hi ha un multivaluelist */
            if(valueListList.length > 0 && this.queryTODO.filters){
                this.queryTODO.filters.forEach(f=>{
                    valueListList.forEach(v=>{
                        if(f.filter_table == v.table_id && f.filter_column == v.column_name  ){
                            f.filter_table =  v.valueListSource.target_table;
                            f.filter_column =  v.valueListSource.target_description_column;
                        }
                    })
                })
            }

            /** Ajusto els joins per que siguin left join en cas els value list*/
            if(valueListList.length > 0){
                valueListList.forEach(v=>{
                    valueListJoins.push(v.valueListSource.target_table);
                    if(v.valueListSource.bridge_table && v.valueListSource.bridge_table != undefined && v.valueListSource.bridge_table.length >= 1){ // les taules pont també han de ser left joins
                        valueListJoins.push(v.valueListSource.bridge_table );
                    }
                });
            }
        }

        /** ..........................PER ELS VALUE LISTS................................ */

        const filterTables = this.queryTODO.filters.map(filter => filter.filter_table);

        // Afegim a dest les taules dels filtres
        filterTables.forEach(table => {
            if (!dest.includes(table) && table !== origin) {
                dest.push(table);
            }
        });


        if (this.permissions.length > 0) {
            this.permissions.forEach(permission => {
                if (!dest.includes(permission.filter_table) && permission.filter_table !== origin) {
                    dest.push(permission.filter_table);
                }
            });
        }
        
        
        /** SEPAREM ENTRE AGGREGATION COLUMNS/GROUPING COLUMNS */
        let separedCols = this.getSeparedColumns(origin, dest);
        let columns = separedCols[0];
        let grouping = separedCols[1];
        
        let joinTree = [];
        let tree = [];
        for (const query of this.queryTODO.fields) {
            if (query.joins && query.joins.length > 0) {
                for (let join of query.joins) {
                    tree.push(join);
                }
            }
        }

        for (const filter of this.queryTODO.filters) {
            if (filter.joins && filter.joins.length > 0) {
                for (const join of filter.joins) {
                    tree.push(join);
                }
            }
        }
    

        if (!this.queryTODO.queryMode || this.queryTODO.queryMode == 'EDA') {
            // Las taules de les consultes van primer per potenciar relacions directes en consultes tipus EDA
            const vals = [...dest];
            const firs = [];
            vals.forEach(v => firs.push(  graph.filter( e => v == e.name )[0])   );
            firs.forEach(e => graph = graph.filter(f=> f.name != e.name)   );
            graph  = [...firs, ...graph];
            
            /** ARBRE DELS JOINS A FER */
            joinTree = this.dijkstraAlgorithm(graph, origin, dest.slice(0));
            // Busco relacions directes.
            if( ! this.validateJoinTree(  joinTree, dest ) ){
                let exito = false;
                let new_origin  = '';
                let new_dest  = [...dest];
                let new_joinTree:any;
                for (let d of  dest) {
                    new_origin = d;
                    new_dest =  [...dest].filter(e => e !== d);
                    new_dest.push(origin);
                    new_joinTree = this.dijkstraAlgorithm(graph, new_origin, new_dest.slice(0) );
                    if(  this.validateJoinTree(  new_joinTree, new_dest ) ){
                        exito = true;
                        break;
                    }
                }
                if(exito){
                    origin = new_origin;
                    dest = [...new_dest];
                    joinTree = new_joinTree;
                }
            }

            this.queryTODO.joined = false;
            /**poso les taules de la consulta al principi del joinTree per potenciar relacions directes */
            const my_tables = [...dest ];
            const firsts = [];
            my_tables.forEach( e => firsts.push(  joinTree.filter( t => e == t.name )[0])  );
            firsts.forEach(e =>   joinTree = joinTree.filter(f=> f.name != e.name)  );
            joinTree  = [...firsts, ...joinTree];

        } else {
            valueListJoins = []; 
            
            const processFields = (fields) => {
                for (const field of fields) {
                    if (field.valueListSource) {
                        
                        field.valueListSource.source_column = field.column_name?field.column_name:field.filter_column;
                        // field.valueListSource.source_table = field.table_id?field.table_id.split('.')[0]:field.filter_table.split('.')[0];

                        const sourceTable = (field.table_id||field.filter_table)
                        // const sourceTable = table.substring(0, table.lastIndexOf('.'));
                        field.valueListSource.source_table = sourceTable;

                        field.table_id = field.valueListSource.target_table;
                        field.column_name = field.valueListSource.target_description_column;

                        if (field.autorelation) {
                            field.valueListSource.source_table = field.joins[field.joins.length-1][0]; //, join[0].substring(sourceLastDotInx + 1)];
                        }

                        
                        if (field.valueListSource.bridge_table?.length > 0) {
                            const j = {
                                source_column: field.valueListSource.source_bridge,
                                source_table: field.valueListSource.source_table,
                                target_id_column: field.valueListSource.source_bridge, //field.valueListSource.target_bridge,
                                target_table: field.valueListSource.bridge_table
                            };
                            valueListJoins.push(j);
                            field.valueListSource.source_column = field.valueListSource.target_bridge;
                            field.valueListSource.source_table = field.valueListSource.bridge_table;
                        }
                        valueListJoins.push(field.valueListSource);
                    }
                }
            };
            
            processFields(this.queryTODO.fields);
            processFields(this.queryTODO.filters);
            
            for (const value of valueListJoins) {
                const multiSourceJoin = `${value.source_table}.${value.source_column}`;
                const multiTargetJoin = `${value.target_table}.${value.target_id_column}`;

                let exists = false;
                for (const join of tree) {
                    const sourceJoin = join[0];
                    const targetJoin = join[1];

                    if (multiSourceJoin == sourceJoin && multiTargetJoin == targetJoin) {
                        exists = true;
                    }
                }

                if (!exists) {
                    tree.push([multiSourceJoin, multiTargetJoin]);
                }
            }
            valueListJoins = [...new Set(valueListJoins.map((value) => value.target_table))];

            tree = [...new Set(tree)];
            joinTree = tree;
            this.queryTODO.joined = true;

            dest = valueListJoins;
            /** SEPAREM ENTRE AGGREGATION COLUMNS/GROUPING COLUMNS */
            separedCols = this.getSeparedColumns(origin, dest);
            columns = separedCols[0];
            grouping = separedCols[1];
        }

        //to WHERE CLAUSE
        const filters = this.queryTODO.filters.filter(f => {
            let column =  this.queryTODO.fields.find(c=> f.filter_table == c.table_id && f.filter_column == c.column_name );
            if(column){
                if(column.hasOwnProperty('aggregation_type')){
                    return column.aggregation_type==='none' || [ 'not_null' , 'not_null_nor_empty' , 'null_or_empty'].includes( f.filter_type) ?true:false || f.filterBeforeGrouping;
                }else{
                    return true;
                }
            }else{
                return f.filterBeforeGrouping;
            }
        });

        // para los filtros en los value list
        filters.forEach(f => {
            if (f.valueListSource) {
                        
                f.filter_table = f.valueListSource.target_table;
                f.filter_column = f.valueListSource.target_description_column;
            }
        });

        //TO HAVING CLAUSE 
        const havingFilters = this.queryTODO.filters.filter(f => {
            const column = this.queryTODO.fields.find(e => e.table_id === f.filter_table &&   f.filter_column === e.column_name);
            if(column){
            return (column.column_type=='numeric' && column.aggregation_type!=='none'?true:false) && !f.filterBeforeGrouping;
            }else{
                return !f.filterBeforeGrouping;
            }
        }).filter(f=> ![ 'not_null' , 'not_null_nor_empty' , 'null_or_empty'].includes( f.filter_type));


        if (this.queryTODO.simple) {
            this.query = this.simpleQuery(columns, origin);
            return this.query;
        } else {
            let tables = this.dataModel.ds.model.tables
                .map(table => { return { name: table.table_name, query: table.query } });
            
            this.query = this.normalQuery(columns, origin, dest, joinTree, grouping,  filters, havingFilters,  tables,
                this.queryTODO.queryLimit,   this.queryTODO.joinType, valueListJoins, this.dataModel.ds.connection.schema, 
                this.dataModel.ds.connection.database, this.queryTODO.forSelector);
            return this.query;
        }
    }

    public buildGraph() {
        const graph = [];
        //No fa falta treure les relacions ocultes per que les poso al array no_relations en guardar-ho
        //Totes les relacions ja son bones. Ho deixo per que el bucle ja es fa...
        this.tables.forEach(t => {
            const relations = [];
            t.relations
                .forEach(r => { relations.push(r.target_table) });
            graph.push({ name: t.table_name, rel: relations });
        });
        return graph;
    }


    /** valida relaciones directas */
    public validateJoinTree(joinTree:any, dest:any){
        for (let i = 0; i < dest.length; i++) {
            let elem = joinTree.find(n => n.name === dest[i]);
            if(elem.dist > 1 ){
                return false;
            }
          }
        return true;
    }

    
    public getGraph(graph, origin, dest) {
        let new_origin = origin;
        const workingGrapth = JSON.parse(JSON.stringify(graph));
        //inicializo en el origen.
        let elem = workingGrapth.filter(e => e.name === new_origin )[0];
        const ruta = { name: elem.name, paths: [] };
        elem.rel.forEach((r,i) => {
            ruta.paths[i]=[];
            ruta.paths[i].push(elem.name);
            ruta.paths[i].push(r);
        });

        let index = workingGrapth.indexOf(workingGrapth.find(x => x.name === elem.name));
        if (index > -1) {
            workingGrapth.splice(index, 1);
        }
        let exito = 0;
        let grow = 0;
        while(exito == 0){
            ruta.paths.forEach((p,i) => {
                grow = 0;
                new_origin = p[p.length-1];
                elem = workingGrapth.filter(e => e.name === new_origin )[0];
                if(elem.rel.length > 1 ){
                    elem.rel.forEach( 
                       e=>{ const currentLenght = ruta.paths[i].length;
                            let dup =  [...ruta.paths[i]];
                            dup.push(e);
                            let unique = new Set(dup);
                            dup = [...unique];
                            const newLenght = dup.length;
                            if( newLenght > currentLenght){
                                grow = 1;
                            }
                            ruta.paths.push( dup );
                       }
                    )
                    ruta.paths.splice(i,1);
                }else{
                    if(ruta.paths.length-1 == i){    exito = 1;    }
                }
            });
            if(grow == 0){
                exito = 1;
            }
          
        }





        const goodPaths = [];
        let finalPaths = [];
        
        ruta.paths.forEach( r => {
            var exito = 1;
            finalPaths.forEach(f=>{ if( this.arrayEquals(r,f) ){exito = 0; } });
            if(exito == 1){
              finalPaths.push(r);
            }
          })
        // rutas limpias sin duplicados.
        ruta.paths = [...finalPaths];
        finalPaths = [];
        
        ruta.paths.forEach( r => {
            let exito = 1;
            dest.forEach(e => {  if(r.indexOf(e)<0){ exito=0;}} );
            if( exito==1){goodPaths.push(r);}
        })
        //Si tengo un origen y un destino.
        goodPaths.forEach((p,i)=>{
            if( dest.indexOf( p[p.length-1] ) >=0 ){ finalPaths.push(p);}
        })

        
     
        ruta.paths = finalPaths;
        //        { name: 'orders', dist: Infinity, path: [] }
     
    }


    public arrayEquals(a, b) {
        return Array.isArray(a) &&
            Array.isArray(b) &&
            a.length === b.length &&
            a.every((val, index) => val === b[index]);
    }
    
    public dijkstraAlgorithm(graph, origin, dest) {
//        this.getGraph(graph, origin, dest);
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



    /** esto se usa para las consultas que hacemos a bbdd para generar el modelo */
    public simpleQuery(columns: string[], origin: string) {
    
        const schema = this.dataModel.ds.connection.schema;
        if (schema) {
            origin = `${schema}.${origin}`;
        }
        return `SELECT DISTINCT ${columns.join(', ')} \nFROM ${origin}`;
    }

    public cleanOriginTable(originTable:string):string {
        let res = "";
        if(originTable.slice(0,1)=='`' && originTable.charAt(originTable.length - 1)=='`'){
            res = originTable.substring(1, originTable.length-1);
        }else if(originTable.slice(0,1)=='\'' && originTable.charAt(originTable.length - 1)=='\''){
            res = originTable.substring(1, originTable.length-1);
        }else if(originTable.slice(0,1)=='"' && originTable.charAt(originTable.length - 1)=='"'){
            res = originTable.substring(1, originTable.length-1);
        }else{
            res = originTable;
        }
        return  res;
    }



    public getPermissions(modelPermissions, modelTables, originTable) {
      
        originTable = this.cleanOriginTable(originTable);
        let filters = [];
        const permissions = this.getUserPermissions(modelPermissions);

       const relatedTables = this.checkRelatedTables(modelTables, originTable); 

        let found = -1;
        if (relatedTables !== null && permissions !== null) {
            permissions.forEach(permission => {
                found = relatedTables.findIndex((t: any) => t.table_name === permission.table);
                if (found >= 0) {
                    if(permission.dynamic){
                            permission.value[0] =  permission.value[0].toString().replace("EDA_USER", this.usercode) 
                           
                    }
                    let filter = {
                        filter_table: permission.table,
                        filter_column: permission.column,
                        filter_dynamic: permission.dynamic?permission.dynamic:false,
                        filter_type: 'in',
                        isGlobal: 'security',
                        filter_id: permission.table + '-' + permission.column + '-' +   'security',
                        filter_elements: [{ value1: permission.value }]
                    };

                    filters.push(filter);
                    found = -1;
                }
            });
        }

        return filters;
    }

  /*SDA CUSTOM*/ @custom.queryBuilderServiceCustomGetTreePermissions 
    public getTreePermissions(modelPermissions,  query) {
          /**
         * Tento todos los permisos modelPermissions
         * Tengo mi consulta query
         * Tengo que añadir los wheres que tocan a la consulta para implmentar los permisos.
         **/      

        let filters = [];
        let columns = [];
       
        const permissions = this.getUserPermissions(modelPermissions);

        query.fields.forEach(f => {
            columns.push( { table_name:  f.table_id,  column_name: f.column_name } )

        });
        query.filters.forEach(f => {
            columns.push( { table_name:  f.filter_table,  column_name: f.filter_column } )

        });

        let found = -1;
        if (columns.length > 0  && permissions !== null) {
            permissions.forEach(permission => {
                found = columns.findIndex((t: any) => t.table_name.split('.')[0] === permission.table);
                if (found >= 0) {
                    if(permission.dynamic){
                            permission.value[0] =  permission.value[0].toString().replace("EDA_USER", this.usercode) 
                           
                    }
                    let filter = {
                        filter_table: permission.table,
                        filter_column: permission.column,
                        filter_type: 'in',
                        isGlobal: 'security',
                        filter_id: permission.table + '-' + permission.column + '-' +   'security',
                        filter_dynamic: permission.dynamic?permission.dynamic:false,
                        filter_elements: [{ value1: permission.value }]
                    };

                    filters.push(filter);
                    found = -1;
                }
            });
        }

        return filters;
    }

    public getUserPermissions(modelPermissions: any[]) {
        const permissions = [];
        modelPermissions.forEach(permission => {
            switch (permission.type) {
                case 'users':
                    if (permission.users.includes(this.user) && !permission.global) {
                        permissions.push(permission);
                    }
                    break;
                case 'groups':
                    this.groups.forEach(group => {
                        if (permission.groups.includes(group) && !permission.global) {
                            permissions.push(permission)
                        }
                    })
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

    // not needed to filter relations. They are stored in a different array
    public findRelationsRecursive(tables, table, vMap) {
        vMap.set(table.table_name, table);
        table.relations
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
        // No needed to filter visible relations because they are stored in a different array: no_relations
        const source_columns = table.relations.find(x => x.target_table === tableB).source_column;
        const target_columns = table.relations.find(x => x.target_table === tableB).target_column;
        return [target_columns, source_columns];

    }


    public findColumn(table: string, column: string) {
        const tmpTable = this.tables.find((t: any) => t.table_name === table.split('.')[0]);
        const col =  tmpTable.columns.find((c: any) => c.column_name === column);
        col.table_id = table;
        return col;
    }

    public findHavingColumn( havingFilter:any) {
        

        if(this.queryTODO.fields.find((f: any)=> f.table_id === havingFilter.filter_table && 
                                            f.filter === havingFilter.filter_column)){
            return this.queryTODO.fields.find((f: any)=> f.table_id === havingFilter.filter_table && 
                                             f.filter === havingFilter.filter_column);
        }else{

            return  { // devolvemos una columna ficticia con los valores que necesitamos para hacer el having
                table_id: havingFilter.filter_table ,
                column_name: havingFilter.filter_column,
                display_name: havingFilter.filter_column,
                column_type: havingFilter.filter_column_type,
                old_column_type: havingFilter.filter_column_type,
                aggregation_type: havingFilter.aggregation_type,
                ordenation_type: 'Asc',
                order: 1,
                column_granted_roles: [],
                row_granted_roles: [],
                tableCount: 0,
                minimumFractionDigits: 0,
                whatif_column: false,
                whatif: {},
                joins: [],
                autorelation: false
            }
        }

        
    }

    public setFilterType(filter: string) {
        if (['=', '!=', '>', '<', '<=', '>=', 'like', 'not_like'].includes(filter)) return 0;
        else if (['not_in', 'in'].includes(filter)) return 1;
        else if (filter === 'between') return 2;
        else if (filter === 'not_null') return 3;
        else if (filter === 'is_null') return 4;
        else if (filter === 'not_null_nor_empty') return 5;
        else if (filter === 'null_or_empty') return 6;
    }



    public sqlBuilder(userQuery: any, filters: any[]): string {

        const graph = this.buildGraph();
        const schema = this.dataModel.ds.connection.schema;
        const modelPermissions = this.dataModel.ds.metadata.model_granted_roles;
        let query = userQuery.SQLexpression;
        
        // añado un espacio en blanco al final de cada linea para asegurar que no se juntan palabras
        let reg = new RegExp(`\n`, "g");
        query = query.replace(reg, ` `);

        if (modelPermissions.length > 0) {


            const root = this.BuildTree(query);
            const value = this.replaceOnTree(root);

            if (!value) return null;

            const tablesInQuery = this.parseTablesInQuery(userQuery.SQLexpression);
            let tablesNoSchema = this.parseSchema(tablesInQuery, schema);

            /**Mark tables to avoid undesired replaces */
            tablesNoSchema.forEach((table, i) => {
                let whitespaces = `[\n\r\s]*`
                let reg = new RegExp(`${tablesInQuery[i]}` + whitespaces, "g");
                query = query.replace(reg, `┘┘${tablesInQuery[i]}┘┘`);

            });

            tablesNoSchema.forEach((table, i) => {
                query = this.sqlReplacePermissions(query, table, graph, `┘┘${tablesInQuery[i]}┘┘`);
            });

            let reg = new RegExp(`┘┘`, "g");
            query = query.replace(reg, ``);
        }

        //Isolate filters from query
        const filterMarks = [];
        let filter = ''
        let opened = false;
        for (let i = 0; i < userQuery.SQLexpression.length; i++) {
            if (userQuery.SQLexpression[i] === '}') {
                opened = false;
                filter = filter + userQuery.SQLexpression[i];
                filterMarks.push(filter);
                filter = '';
            }
            if (userQuery.SQLexpression[i] === '$' || opened) {
                opened = true;
                filter = filter + userQuery.SQLexpression[i];
            }
        }

        //Get sql formated filters ad types
        const formatedFilters: any[] = [];
        filters.forEach(filter => {
            formatedFilters.push({ string: this.filterToString(filter ), type: filter.filter_type });
        });

        return this.sqlQuery(query, formatedFilters, filterMarks);
    }

    sqlReplacePermissions = (sqlquery: string, table: string, graph: any, tableWithSchema: string) => {

        const SCHEMA = this.dataModel.ds.connection.schema;
        const origin = table;
        const dest = [];
        const modelPermissions = this.dataModel.ds.metadata.model_granted_roles;
        const permissions = this.getPermissions(modelPermissions, this.tables, origin);
        const joinType = 'inner'; // es per els permisos. Ha de ser així.
        const valueListJoins = []; // anulat

        let tables = this.dataModel.ds.model.tables
            .map(table => { return { name: table.table_name, query: table.query } });

        if (permissions.length > 0) {
            permissions.forEach(permission => {
                if (!dest.includes(permission.filter_table)) {
                    dest.push(permission.filter_table);
                }
            });

            const joinTree = this.dijkstraAlgorithm(graph, origin, dest.slice(0));
            const permissionJoins = this.getJoins(joinTree, dest, tables, joinType, valueListJoins, SCHEMA);

            let joinsubstitute = '';
            joinsubstitute = this.buildPermissionJoin(origin, permissionJoins, permissions, SCHEMA);

            let whitespaces = `[\n\r\s]*`
            let reg = new RegExp(`${tableWithSchema}` + whitespaces, "g");

            let out = sqlquery.replace(reg, joinsubstitute);
            return out;

        } else {
            return sqlquery;
        }
    }

    cleanComments = (sqlQuery: any) => {
        let reg = new RegExp(/\/\*[^*]*\*+(?:[^*/][^*]*\*+)*\//, "g");
        sqlQuery = sqlQuery.replace(reg, '').split('\n');
        reg = new RegExp(/^\s*(--|#)/, "g");
        let noLineComments = [];
        sqlQuery.forEach(line => {
            if (!line.match(reg)) {
                noLineComments.push(line);
            };
        });
        return noLineComments.join(' ')
    }



    parseTablesInQuery = (sqlQuery: string) => {
        /**remove  comments */
        let reg = new RegExp(/[()]/, 'g')
        sqlQuery = this.cleanComments(sqlQuery).replace(reg, '').replace(/\s\s+/g, ' ') + ' ';
        reg = new RegExp(/\(/, 'g')
        sqlQuery = sqlQuery.replace(reg, ' ( ');
        reg = new RegExp(/\)/, 'g')
        sqlQuery = sqlQuery.replace(reg, ' ) ');
        let words = [];
        let tables = [];

        words = sqlQuery.split(' ');
        for (let i = 0; i < words.length; i++) {
            if (
                (words[i].toUpperCase() === 'FROM' || words[i].toUpperCase() === 'JOIN') &&
                (words[i + 1] !== '(' && words[i + 1].toUpperCase() !== 'SELECT')  // la paraula que ve despres de un from i no es una subconsulta
            ) {
                tables.push(words[i + 1]);
            }
        }
        return tables.filter(this.onlyUnique);
    }


    onlyUnique = (value, index, self) => {
        return self.indexOf(value) === index;
    }

    public createTable(queryData: any) {
        let create = `CREATE TABLE ${queryData.tableName} (\n`;
        queryData.columns.forEach(col => {
            create += `"${this.abc_123(col.field)}" ${col.type},\n`;
        });
        create = create.slice(0, -2);
        create += '\n);'
        return create;
    }

    public abc_123(str: string): string {
        return str.replace(/[^\w\s]/gi, '').replace(/ /gi, '_');
    }

    public generateInserts(queryData: any) {
        let insert = `INSERT INTO ${queryData.tableName} VALUES\n`;
        queryData.data.forEach((register) => {
            let row = '('
            Object.values(register).forEach((value: any, i) => {
                const type = queryData.columns[i].type;
                if (type === 'text') {
                    row += `'${value.replace(/'/g, "''")}',`;
                } else if (type === 'timestamp') {
                    let date = value ? `TO_TIMESTAMP('${value}', '${queryData.columns[i].format}'),` : `${null},`
                    row += `${date}`;
                } else {
                    value = queryData.columns[i].separator === ',' ? parseFloat(value.replace(".", "").replace(",", "."))
                        : parseFloat(value.replace(",", ""));
                    value = value ? value : null;
                    row += `${value},`;
                }
            });
            row = row.slice(0, -1);
            row += ')';
            insert += `${row},`
        });
        insert = insert.slice(0, -1);
        return insert;
    }


    public BuildTree = (query) => {

        let sqlQuery = query.replace(/[\t\n\r]/gm, '');
        sqlQuery = `(${sqlQuery})`;

        let nestedQueries = [];
        let parents = '';

        for (let i = 0; i < sqlQuery.length; i++) {

            if (sqlQuery[i] === '(') parents += '(';
            if (sqlQuery[i] === ')') parents += ')';

            let nested = '';
            let j = i + 1;
            let opened = 0;

            if (sqlQuery[i] === '(') {
                nested += '(';
                opened++;
                while (opened > 0 && j < sqlQuery.length) {
                    nested += sqlQuery[j];
                    if (sqlQuery[j] === '(') { opened++ };
                    if (sqlQuery[j] === ')') { opened-- };
                    j++;
                }
            }
            if (nested.length > 0) {
                nestedQueries.push(nested);
            }
        }

        let root = new TreeNode(nestedQueries[0])
        let stack = [root];
        let node = null;
        let ptr = 1;

        for (let i = 1; i < parents.length; i++) {

            if (parents[i] === '(') {

                let newNode = new TreeNode(nestedQueries[ptr]);

                if (stack.length > 0) {
                    node = stack[stack.length - 1];
                    node.child.push(newNode);
                    stack.push(newNode);
                } else {
                    stack.push(newNode);
                }
                ptr++;

            } else if (parents[i] === ')') {
                stack.pop();
            }
        }
        return root;

    }

    public replaceOnTree = (root) => {

        if (root.child.length === 0) {
            if (!this.checkFormat(root.value)) return false;
            else return true;
        }
        else {
            let str = root.value;
            for (let i = 0; i < root.child.length; i++) {

                const check = this.replaceOnTree(root.child[i]);

                if (check) {
                    str = str.replace(root.child[i].value, ' ___ ');
                } else {
                    return false;
                }

            }
            if (!this.checkFormat(str)) return false;
            else return true;
        }

    }

    public checkFormat = (expression) => {

        const words = expression.split(/\s+/);
        let currentOperand = '';
        for (let i = 0; i < words.length; i++) {

            let word = words[i].toUpperCase();
            if (
                word === 'FROM'
                || word === 'SELECT'
                || word === 'JOIN'
                || word === 'WHERE'
                || word === 'GROUP'
            ) {
                currentOperand = word;
            }

            if (currentOperand === 'FROM' && word.includes(',')) return false;

        }

        return true;

    }

    public getEqualFilters = (filters) => {
        /**
         * LOS FILTROS TIENEN DIFERENTES NIVELES GLOBAL = A NIVEL DE DASHBOARD - LOCAL = A NIVEL DE PANEL - SEGURIDAD = QUE VIENEN DE LA SEGURIDAD
         * LOS FILTORS SE CONCATENAN CON UN AND NORMALMENTE. PERO SI PONGO FILTROS SOBRE LA MISMA COLUMNA AL MISMO NIVEL (ISGLOBAL) SE CONCATENAN
         * CON UN OR. QUE ES EL FUNCIONAMIENTO ESPERADO.
         * 
          */
        let filterMap = new Map();
        let toRemove = [];
        filters.forEach(filter => {
            let myKey = filter.filter_table + filter.filter_column + filter.isGlobal;
            if(filter.isGlobal == 'security'){
                myKey = filter.filter_table +'security'  /**   si es de seguridad se deben combinar todos los filtros. */
            }
            let node = filterMap.get(myKey);
            if (node) {
                node.push(filter);
                node.forEach(filter => {
                    if (!toRemove.includes(filter.filter_id)) {
                        toRemove.push(filter.filter_id);
                    }
                })
            } else {
                filterMap.set(myKey, [filter]);
            }

        });
        filterMap.forEach((value, k) => {
             if (value.length < 2) {
                filterMap.delete(k);
            }
        })
        return { map: filterMap, toRemove: toRemove };
    }


    public mergeFilterStrings = (filtersString, equalfilters ) => {
        if (equalfilters.toRemove.length > 0) {
            equalfilters.map.forEach((value, key) => {
                let filterSTR = '\nand ( '    
                let n = value.filter( f=> (f.filter_type == 'not_null'  || f.filter_type == 'not_null_nor_empty' || f.filter_type == 'null_or_empty') );
                let values = [...n, ...value.filter( f=> f.filter_type != 'not_null')];            
                values.forEach((f) => {
                    if (f.filter_type == 'not_null' || f.filter_type == 'not_null_nor_empty' || f.filter_type == 'null_or_empty') {                        //Fins que no es pugi determinar el tipus de conjunció. Els filtres sobre una mateixa columna es un or perque vull dos grups. EXCEPTE QUAN ES UN NULL
                        filterSTR += this.filterToString(f) + '\n  and ';
                    } else {
                        filterSTR += this.filterToString(f) + '\n  or ';
                    }
                });

                filterSTR = filterSTR.slice(0, -4);
                filterSTR += ' ) ';
                filtersString += filterSTR;
            });

        }

        return filtersString;
    }

}
