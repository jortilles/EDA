import { Client as PgClient } from 'pg';
import { PgBuilderService } from '../../query-builder/qb-systems/pg-builder-service';
import { AbstractConnection } from '../abstract-connection';
import { AggregationTypes }  from  '../../../module/global/model/aggregation-types';
import DataSource from '../../../module/datasource/model/datasource.model';

var types = require('pg').types;
types.setTypeParser(1700, 'text', parseFloat);


export class PgConnection extends AbstractConnection {
   
    GetDefaultSchema(): string {
        return 'public';
    }

    private queryBuilder: PgBuilderService;
    private AggTypes: AggregationTypes;

    async getPool(){
        try{
            const connection = new PgClient(this.config);
            return connection;
        }catch(err){
            throw err;
        }
    }

    async tryConnection(): Promise<any> {
        try {
            this.pool = await this.getPool();
            console.log('\x1b[32m%s\x1b[0m', 'Connecting to PostgreSQL database...\n');
            await this.pool.connect();
            this.itsConnected();
            await this.pool.end();
            return;
        } catch (err) {
            throw err;
        }
    }

    async generateDataModel(optimize:string): Promise<any> {
        try {
            this.pool = await this.getPool();
            const tableNames = [];
            const tables = [];

            let whereTableSchema: string = !this.config.schema 
                ? `NOT IN ('pg_catalog', 'information_schema')`
                : `=  '${this.config.schema}' `
            ;
            const query = `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_type = 'BASE TABLE' AND table_schema ${whereTableSchema}
                UNION ALL
                SELECT  table_name 
                FROM  information_schema.views 
                WHERE table_schema ${whereTableSchema}
            `;

            console.log(query);

            const getResults = await this.execQuery(query);
            
            for (let i = 0, n = getResults.length; i < n; i++) {
                const result = getResults[i];
                tableNames.push(result['table_name']);
            }


            // New client is needed, old client has been closed;
            this.pool = await this.getPool();
            this.pool.connect();

            for (let i = 0; i < tableNames.length; i++) {
                let new_table = await this.setTable(tableNames[i]);
                let count = 0;
                if(optimize === '1'){
                    const dbCount = await this.countTable(tableNames[i], `${this.config.schema || 'public'}`);
                    count = dbCount.rows[0].count;
                }
                new_table.tableCount = count;
                tables.push(new_table);
            }

            for (let i = 0; i < tables.length; i++) {
                for (let j = 0; j < tables[i].columns.length; j++) {
                    tables[i].columns[j] = this.setColumns(tables[i].columns[j], tables[i].tableCount);
                }
            }

            this.pool.end();

            return await this.commonColumns(tables);
        } catch (err) {
            throw err;
        }
    }

    async execQuery(query: string): Promise<any> {
        let client: { connect: () => void; query: (arg0: string) => any; end: () => void; };
        try {
            client = this.pool;
            client.connect();
            const searchPath = await client.query(`SET search_path TO '${this.config.schema || 'public'}';`)
            const result = await client.query(query);
            client.end();
            return result.rows;
        } catch (err) {
            console.log(err);
            throw err;
        } finally {
            client.end();
        }
    }

    async getDataSource(id: string) {
        try {
            return await DataSource.findOne({ _id: id }, (err, datasource) => {
                if (err) {
                    throw Error(err);
                }
                return datasource;
            });
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    async getQueryBuilded(queryData: any, dataModel: any, user: string) {
        this.queryBuilder = new PgBuilderService(queryData, dataModel, user);
        return this.queryBuilder.builder();
    }

    BuildSqlQuery(queryData: any, dataModel: any, user: string): string {
        this.queryBuilder = new PgBuilderService(queryData, dataModel, user);
        return this.queryBuilder.sqlBuilder(queryData, queryData.filters);
    }


    private async countTable(tableName: string, schema:string): Promise<any> {
        const query = `
        SELECT count(*) as count from ${schema}.${tableName}
        `;
        console.log(query);
        return new Promise(async (resolve, reject) => {
            try {
                const count = await this.pool.query(query);
                resolve(count);
            } catch (err) {
                reject(err);
            }
        })
    }

    private async setTable(tableName: string): Promise<any> {
        const query = `SELECT column_name, udt_name AS column_type FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = '${tableName}';`;

        return new Promise(async (resolve, reject) => {
            try {
                const getColumns = await this.pool.query(query);
                const newTable = {
                    table_name: tableName,
                    display_name: {
                        'default': this.normalizeName(tableName),
                        'localized': []
                    },
                    description: {
                        'default': `${this.normalizeName(tableName)}`,
                        'localized': []
                    },
                    table_granted_roles: [],
                    table_type: [],
                    columns: getColumns.rows,
                    relations: [],
                    visible: true
                };
                resolve(newTable);
            } catch (err) {
                reject(err);
            }
        });
    }

    private setColumns(c, tableCount?:number) {
        let column = c;
        column.display_name = { default: this.normalizeName(column.column_name), localized: [] };
        column.description = { default: this.normalizeName(column.column_name), localized: [] };
        column.column_type = this.normalizeType(column.column_type) || column.column_type;


        column.column_type === 'numeric'
            ? column.aggregation_type =   AggregationTypes.getValues() 
            : column.aggregation_type = [{ value: 'none', display_name: 'no' }];

        column.computed_column == 'no'   // las posibilidades son no, computed_numeric, computed_string

        column.column_granted_roles = [];
        column.row_granted_roles = [];
        column.visible = true;
        column.tableCount = tableCount || 0;

        return column;
    }

    private normalizeName(name: string) {
        let out = name.split('_').join(' ');
        return out.toLowerCase()
            .split(' ')
            .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
            .join(' ');
    }

    private normalizeType(type: string) {
        switch (type) {
            case 'int4': return 'numeric';
            case 'int8': return 'numeric';
            case 'smallint': return 'numeric';
            case 'serial': return 'numeric';
            case 'decimal': return 'numeric';
            case 'float8': return 'numeric';
            case 'float16': return 'numeric';
            case 'real': return 'numeric';
            case 'timestamp': return 'date';
            case 'time': return 'date';
            case 'TIMESTAMPTZ': return 'date';
            case 'bool': return 'boolean';
            case 'text': return 'varchar';
            case 'char': return 'varchar';
        }
    }

    private async commonColumns(dm) {
        let data_model = dm;
        let visited = [];
        // Recorrem totes les columnes de totes les taules i comparem amb totes les columnes de cada taula (menys la que estem recorrent
        // Taules
        for (let l = 0; l < data_model.length; l++) {
            visited.push(data_model[l].table_name);
            // Columnes
            for (let k = 0; k < data_model[l].columns.length; k++) {
                let sourceColumn = { source_column: data_model[l].columns[k].column_name, column_type: data_model[l].columns[k].column_type };
                // Taules
                for (let j = 0; j < data_model.length; j++) {

                    if (!visited.includes(data_model[j].table_name)) {
                        // Columnes
                        for (let i = 0; i < data_model[j].columns.length; i++) {
                            let targetColumn = { target_column: data_model[j].columns[i].column_name, column_type: data_model[j].columns[i].column_type };
                            if ((sourceColumn.source_column.toLowerCase().includes('_id') ||
                                sourceColumn.source_column.toLowerCase().includes('id_') ||
                                sourceColumn.source_column.toLowerCase().includes('number') ||
                                sourceColumn.source_column.toLowerCase().startsWith("sk") ||
                                sourceColumn.source_column.toLowerCase().startsWith("tk") ||
                                sourceColumn.source_column.toLowerCase().endsWith("sk") ||
                                sourceColumn.source_column.toLowerCase().endsWith("tk") ||
                                sourceColumn.source_column.toLowerCase().includes('code'))
                                && sourceColumn.source_column === targetColumn.target_column && sourceColumn.column_type === targetColumn.column_type) {

                                // FER EL CHECK AMB ELS INNER JOINS ---- DESHABILITAT (Masses connexions a la db)
                                let a = true; //await checkJoins(pool, data_model[l].table_name, sourceColumn.source_column, data_model[j].table_name, targetColumn.target_column);

                                if (a) {
                                    data_model[l].relations.push({
                                        source_table: data_model[l].table_name,
                                        source_column: sourceColumn.source_column,
                                        target_table: data_model[j].table_name,
                                        target_column: targetColumn.target_column,
                                        visible: true
                                    });
                                    data_model[j].relations.push({
                                        source_table: data_model[j].table_name,
                                        source_column: targetColumn.target_column,
                                        target_table: data_model[l].table_name,
                                        target_column: sourceColumn.source_column,
                                        visible: true
                                    });

                                }
                            }
                        }
                    }
                }
            }
        }
        return data_model;
    }

    createTable(queryData: any): string {
        this.queryBuilder = new PgBuilderService(queryData, {ds:{model:{tables:[]}}}, null);
        return this.queryBuilder.createTable(queryData);
    }

    generateInserts(queryData:any):string {
        this.queryBuilder = new PgBuilderService(queryData, {ds:{model:{tables:[]}}}, null);
        return this.queryBuilder.generateInserts(queryData);
    }
}
