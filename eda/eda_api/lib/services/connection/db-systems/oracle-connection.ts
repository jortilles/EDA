import * as oracledbTypes from 'oracledb';
import { AbstractConnection } from '../abstract-connection';
import { AggregationTypes } from '../../../module/global/model/aggregation-types';
import DataSource from '../../../module/datasource/model/datasource.model';
import { OracleBuilderService } from '../../query-builder/qb-systems/oracle-builder.service';
import oracledb from 'oracledb';


/**
 * WARNING !! La resposta de oracledb dóna problemes de format (objecte, array) ?? 
 */


export class OracleConnection extends AbstractConnection {


    private queryBuilder: OracleBuilderService;
    private AggTypes: AggregationTypes;

    constructor(config){
        super(config);
        if(!this.config.schema){
            this.config.schema = this.GetDefaultSchema();
        }
    }

    GetDefaultSchema(): string {
        return this.config.user.toUpperCase();
    }

    async getPool() {

        try {
            const connectString = parseInt(this.config.sid) === 1 ? 
                `(DESCRIPTION =
                    (ADDRESS = (PROTOCOL = TCP)(HOST = ${this.config.host})(PORT = 1521))
                    (CONNECT_DATA =
                        (SERVER = DEDICATED)
                        (SID = ${this.config.database})
                    )
                )` : `${this.config.host}/${this.config.database}`;


            const pool = await oracledb.createPool({
                user: this.config.user,
                password: this.config.password,
                connectString: connectString
            });
            const connection = await pool.getConnection();
            return connection;

        } catch (err) {
            console.error(err.message);
        }
    }

    async tryConnection(): Promise<any> {
        try {
            this.pool = await this.getPool();
            console.log('\x1b[32m%s\x1b[0m', 'Connecting to Oracle database...\n');
            this.itsConnected();
        } catch (err) {
            throw err;
        } finally {
            if (this.pool) {
                try {
                    await this.pool.close();
                } catch (err) {
                    console.error(err.message);
                }
            }
        }
    }

    async generateDataModel(optimize: string): Promise<any> {
        try {
            // this.pool = await this.getPool();
            const tableNames = [];
            const tables = [];

            let whereTableSchema: string = `OWNER = '${this.config.schema}'`
                
            const query = `
              SELECT DISTINCT OBJECT_NAME 
              FROM ALL_OBJECTS
              WHERE OBJECT_TYPE = 'TABLE'
              AND ${whereTableSchema}
              UNION ALL
              SELECT DISTINCT VIEW_NAME
              from sys.all_views
              WHERE ${whereTableSchema}
            `;

            const getResults = await this.execQuery(query);
            for (let i = 0, n = getResults.length; i < n; i++) {
                const result = getResults[i];
                tableNames.push(result.OBJECT_NAME);
            }
            // New pool is needed, old client has been closed;
            this.pool = await this.getPool();
            for (let i = 0; i < tableNames.length; i++) {
                let new_table = await this.setTable(tableNames[i]);
                let count = 0;
                if (optimize === '1') {
                    const dbCount = await this.countTable(tableNames[i], `${this.config.schema}`);
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
            return await this.commonColumns(tables);
        } catch (err) {
            throw err;
        } finally {
            if (this.pool) {
                this.pool.close();
            }
        }
    }

    async execQuery(query: string): Promise<any> {
        let client: oracledbTypes.Connection;
        try {
            client = await this.getPool();
            
            await client.execute(`alter session set current_schema = ${this.config.schema} `)
            const result  = await client.execute(query);
            const labels = result.metaData.map(x => x.name);
            const parsedResults = [];
            result.rows.forEach(row => {
                const r = {};
                for(let j = 0; j < labels.length; j++){
                    r[labels[j]] = row[j];
                }
                parsedResults.push(r);
            })
            return parsedResults;

        } catch (err) {
            console.log(err);
            throw err;
        } finally {
            client.close();
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
        this.queryBuilder = new OracleBuilderService(queryData, dataModel, user);
        return this.queryBuilder.builder();
    }

    BuildSqlQuery(queryData: any, dataModel: any, user: string): string {
        this.queryBuilder = new OracleBuilderService(queryData, dataModel, user);
        return this.queryBuilder.sqlBuilder(queryData, queryData.filters);
    }


    private async countTable(tableName: string, schema: string): Promise<any> {
        // const schemaString = schema !== 'null' ? `${schema}` : `${this.config.user.toUpperCase()}`;
        const query = `
        SELECT count(*) as count from ${schema}.${tableName}
        `;

        return new Promise(async (resolve, reject) => {
            try {
                const count = await this.pool.execute(query);
                resolve(count);
            } catch (err) {
                reject(err);
            }
        })
    }

    private async setTable(tableName: string): Promise<any> {

        // const schema = this.config.schema ? this.config.schema : this.config.user.toUpperCase();

        const query = ` SELECT DISTINCT column_name, data_type
                        FROM ALL_TAB_COLUMNS
                        WHERE table_name = '${tableName}'
                        AND OWNER = '${this.config.schema}'`;


        return new Promise(async (resolve, reject) => {
            try {
                const getColumns = await this.pool.execute(query);
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

    private setColumns(c, tableCount?: number) {
        let column: any = {};
        column.column_name = c[0];
        column.display_name = { default: this.normalizeName(c[0]), localized: [] };
        column.description = { default: this.normalizeName(c[0]), localized: [] };
        column.column_type = this.normalizeType(c[1]) || column.column_type;


        column.column_type === 'numeric'
            ? column.aggregation_type = AggregationTypes.getValues()
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
        throw new Error('Method not implemented.');
    }
    generateInserts(queryData:any):string {
        throw new Error('Method not implemented.');
    }
}
