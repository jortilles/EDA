import { AbstractConnection } from '../abstract-connection';
import { AggregationTypes } from '../../../module/global/model/aggregation-types';
import { SQLserviceBuilderService } from '../../query-builder/qb-systems/sqlserver-builder-service';
import DataSource from '../../../module/datasource/model/datasource.model';

const SQLservice = require('mssql')



export class SQLserverConnection extends AbstractConnection {
    
    GetDefaultSchema(): string {
        return 'dbo';
    }

    private queryBuilder: SQLserviceBuilderService;
    async getPool(): Promise<any> {
        let config = {
            server: this.config.host,
            port: parseInt(this.config.port),
            user: this.config.user,
            password: this.config.password,
            database: this.config.database,
            options: {
                enableArithAbort: true,
                encrypt: false // antes estava a true. Robson reportó que en docker no funcionava bien.
            }
        }

        const pool = new SQLservice.ConnectionPool(config);

        return new Promise((resolve, reject) => {
            pool.connect((err, conn) => {
                if (err) {
                    return reject(err);
                }
                return resolve(conn);
            });

        }).catch((err) => {
            throw err;
        });
    }

    async tryConnection(): Promise<void> {
        try {
            console.log('\x1b[32m%s\x1b[0m', 'Connecting to SQLserver database...\n');
            this.pool = await this.getPool();
            this.itsConnected();
            return this.pool;
        } catch (err) {
            console.log(err)
            throw err;
        }
    }

    async generateDataModel(optimize:string): Promise<any> {
        try {
            this.pool = await this.getPool();
            let tableNames = [];
            let tables = [];
            let where: string = '';
            let schema = this.config.schema;

            //console.log(this.config);
    
            if (!schema) {
                schema = 'dbo';
            }
            where = ` AND TABLE_SCHEMA = '${schema}'`;
            const query = `
                SELECT TABLE_NAME from INFORMATION_SCHEMA.tables WHERE table_type = 'BASE TABLE' ${where}  
                UNION ALL
                SELECT TABLE_NAME from INFORMATION_SCHEMA.VIEWS v WHERE 1=1 ${where} 
                ORDER BY TABLE_NAME
            `;

            console.log(query);

            const getResults = await this.execQuery(query);
            getResults.forEach(r => {
                let tableName = r['TABLE_NAME'];
                tableNames.push(tableName);
            });

            for (let i = 0; i < tableNames.length; i++) {
                let new_table = await this.setTable(tableNames[i]);
                let count = 0;
                if(optimize === '1'){
                    const dbCount = await this.countTable(tableNames[i], `${this.config.schema || 'dbo'}`);
                    count = dbCount.recordset[0].count;
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
            this.pool.close();
        }
    }

    async execQuery(query: string): Promise<any> {
        let connection: { query: (arg0: string, arg1: (err: any, resultset: any) => void) => void; };
        connection = this.pool;
        return new Promise(async (resolve, reject) => {
            connection.query(query, (err, response) => {
                if (err) {
                    return reject(err);
                }
                let rows = response.recordset;
                resolve(rows);
            });
        }).catch(err => { throw err });
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

    getQueryBuilded(queryData: any, dataModel: any, user: string): Promise<any> {
        this.queryBuilder = new SQLserviceBuilderService(queryData, dataModel, user);
        return this.queryBuilder.builder();
    }

    BuildSqlQuery(queryData: any, dataModel: any, user: string): string {
        this.queryBuilder = new SQLserviceBuilderService(queryData, dataModel, user);
        return this.queryBuilder.sqlBuilder(queryData, queryData.filters);
    }


    private async countTable(tableName: string, schema:string): Promise<any> {
        const query = `SELECT count(*) as count from ${schema}.${tableName}`;
        console.log(query);

        return new Promise(async (resolve, reject) => {
            try {
                const count = await this.pool.query(query);
                resolve(count);
            } catch (err) {
                console.log(err)
                resolve({recordset:[0]})
                //reject(err);
            }
        })
    }

    private async setTable(tableName: string): Promise<any> {
        const where = [];

        where.push(`TABLE_NAME = '${tableName}'`);

        if (this.config.schema) {
            where.push(`TABLE_SCHEMA = '${this.config.schema}'`);
        }

        const query = `
            SELECT COLUMN_NAME AS column_name, DATA_TYPE AS column_type
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE ${where.join(' AND ')}  
        `;
        //console.log(query);
        try {
            const columns = await this.execQuery(query);
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
                columns: columns,
                relations: [],
                visible: true
            };
            return newTable
        } catch (err) {
            return (err);
        }
    }

    private setColumns(c, tableCount?:number) {
        let column = c;

        column.display_name = { default: this.normalizeName(column.column_name), localized: [] };
        column.description = { default: this.normalizeName(column.column_name), localized: [] };
        column.column_type = this.normalizeType(column.column_type) || column.column_type;

        column.column_type === 'numeric'
            ? column.aggregation_type = AggregationTypes.getValues()
            : column.aggregation_type = [{ value: 'none', display_name: 'no' }];

        column.column_granted_roles = [];
        column.row_granted_roles = [];
        column.visible = true;
        column.tableCount = tableCount;
        return column;
    }

    private normalizeType(type: string) {
        switch (type) {
            case 'int': return 'numeric';
            case 'tinyint': return 'numeric';
            case 'smallint': return 'numeric';
            case 'mediumint': return 'numeric';
            case 'bigInt': return 'numeric';
            case 'bigint': return 'numeric';
            case 'integer': return 'numeric';
            case 'decimal': return 'numeric';
            case 'dec': return 'numeric';
            case 'double': return 'numeric';
            case 'varbinary': return 'numeric';
            case 'bit': return 'numeric';
            case 'float': return 'numeric';
            case 'timestamp': return 'date';
            case 'time': return 'date';
            case 'datetime': return 'date';
            case 'date': return 'date';
            case 'bool': return 'boolean';
            case 'char': return 'varchar';
            case 'text': return 'varchar';
            case 'nvarchar': return 'varchar';
            case 'nchar': return 'varchar';
            default: 'varchar';
        }
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