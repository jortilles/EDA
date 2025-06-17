import { createConnection, createPool, Connection as SqlConnection } from 'mysql2/promise';
import { MySqlBuilderService } from "../../query-builder/qb-systems/mySql-builder.service";
import { AbstractConnection } from "../abstract-connection";
import { AggregationTypes } from "../../../module/global/model/aggregation-types";
import { ConnectionOptions, PoolOptions, Pool } from 'mysql2/typings/mysql';
import { PoolManagerConnectionSingleton } from '../pool-manager-connection';
const util = require('util');
/*SDA CUSTOM*/const SCRMConfig=require('../../../../config/sinergiacrm.config.js');

export class MysqlConnection extends AbstractConnection {
    private static instance: MysqlConnection;
    private queryBuilder: MySqlBuilderService;
    private AggTypes: AggregationTypes;
    private pool: Pool;

    public GetDefaultSchema(): string { return null; }

    public async getclient() {
        if (this.config.poolLimit) {
            const poolManager = PoolManagerConnectionSingleton.getInstance();
            const existingPool = poolManager.getPool(this.config.database);

            if (existingPool) {
                console.log('same pool');
                this.pool = existingPool;
            } else {
                const mySqlConn: PoolOptions = {
                    host: this.config.host,
                    port: this.config.port,
                    user: this.config.user,
                    password: this.config.password,
                    database: this.config.database,
                    waitForConnections: true,
                    connectionLimit: this.config.poolLimit,
                    queueLimit: 0,
                    enableKeepAlive: true,
                    keepAliveInitialDelay: 0
                                    };

                poolManager.createPool(this.config.database, mySqlConn);
                this.pool = poolManager.getPool(this.config.database);

                console.log('new pool');
            }

            return this.pool;
        } 

        const mySqlConn: ConnectionOptions = {
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password
        };

        return createConnection(mySqlConn);
    }

    // SDA CUSTOM - Change tryConnection to use mysql2/promise
    async tryConnection(): Promise<any> {
        try {
            const mySqlConn ={ "host": this.config.host,    "port": this.config.port,     "database": this.config.database, "user": this.config.user, "password": this.config.password };
            this.client = await createConnection(mySqlConn);
            console.log('\x1b[32m%s\x1b[0m', 'Connecting to MySQL database...\n');
            this.itsConnected();

            // Close connection
            await this.client.end();

            return this.client;
    
        } catch (err) {
            console.log('\x1b[31m%s\x1b[0m', 'Error connecting to MySQL database\n');
            throw err;
        }
    }
    // END SDA CUSTOM

    async generateDataModel(optimize:number, filter:string): Promise<any> {
        try {
            const tableNames = [];
            this.client = await this.getclient();
            const schema = this.config.database;
            let tables = [];


            /**
            * Set filter for tables if exists
            */
             const filters = filter ? filter.split(',') : []
             let filter_str = filter ? `AND ( table_name LIKE '${filters[0].trim()}'` : ``;
             for (let i = 1; i < filters.length; i++) {
                 filter_str += ` OR table_name LIKE '${filters[i].trim()}'`;
             }
             if (filter) filter_str += ' )';


            const query = `
            SELECT *  FROM information_schema.tables   
            WHERE table_type in ( 'BASE TABLE', 'VIEW', 'base table', 'view')  
            and TABLE_SCHEMA = '${schema}' ${filter_str};
            `;

            const getResults = await this.execQuery(query);
            getResults.forEach(r => {
                let tableName = r['TABLE_NAME'];
                tableNames.push(tableName);
            });

            /**Search for foreign keys */
            const fkQuery = `SELECT TABLE_NAME as 'primary_table', COLUMN_NAME as 'pk_column', 
                                    REFERENCED_TABLE_NAME as 'foreign_table', REFERENCED_COLUMN_NAME as 'fk_column'
                            FROM  INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                            WHERE
                            REFERENCED_TABLE_SCHEMA = '${schema}'
                            and REFERENCED_TABLE_NAME is not null
                            AND REFERENCED_COLUMN_NAME is not null;`

            this.client = await this.getclient();
            const foreignKeys = await this.execQuery(fkQuery);
            this.client = await this.getclient();
            this.client.query = util.promisify(this.client.query);
            for (let i = 0; i < tableNames.length; i++) {
                let new_table = await this.setTable(tableNames[i]);
                let count = 0;
                if(optimize === 1){
                    const dbCount = await this.countTable(tableNames[i]);
                    count = dbCount[0].count;
                }
                new_table.tableCount = count;
                tables.push(new_table);
                if(i> 400){
                    console.log('Un datasource no puede tener más de 400 tablas ');
                    i = tableNames.length + 1;
                }
            }
            for (let i = 0; i < tables.length; i++) {
                for (let j = 0; j < tables[i].columns.length; j++) {
                    tables[i].columns[j] = this.setColumns(tables[i].columns[j], tables[i].tableCount);
                }
            }
            // if (!this.pool && this.client.itsConnected()) this.client.end();
            
            /**Return datamodel with foreign-keys-relations if exists or custom relations if not */
            if(foreignKeys.length > 0) return await this.setForeignKeys(tables, foreignKeys);
            else return await this.setRelations(tables);

        } catch (err) {
            throw err;
        }
    }
    
    
    // SDA CUSTOM JCH (add timeout to individual queries)
    // https://github.com/SinergiaTIC/SinergiaDA/pull/256/files
    //  async execQuery(query: string): Promise<any> {
    //      try {
    //          this.client.query = util.promisify(this.client.query);
    //          const rows = await this.client.query(query);
    //          // console.log(this.client.itsConnected());
    //          // if (!this.pool && this.client.itsConnected() ) this.client.end();
    //          return rows;
    //      } catch (err) {
    //          console.log(err);
    //          throw err;
    //      }
    //  }
     
    /**
    * Executes a MySQL query with a timeout constraint
    * 
    * @param query - The SQL query string to execute
    * @returns Promise that resolves to the query results
    * @throws Error if query execution fails or times out after 60 seconds
    */
    async execQuery(query: string): Promise<any> {
        try {
            // Convert callback-based query to promise-based
            this.client.query = util.promisify(this.client.query);

            let maxStatementTime = SCRMConfig.sinergiaConn.maxStatementTime ?? 60;
            console.log(`SET maxStatementTime=${maxStatementTime}`);
            
            // Add timeout constraint to the query
            const queryWithTimeout = `SET STATEMENT max_statement_time=${maxStatementTime} FOR ${query}`;

            // Create timeout promise that rejects after 60 seconds
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Query execution timed out after ${maxStatementTime} seconds`));
                }, (maxStatementTime * 1000));
            });
        
            // Execute query with a race between actual query and timeout
            const rows = await Promise.race([
                this.client.query(queryWithTimeout),
                timeoutPromise
            ]);
        
            return rows;
        } catch (err) {
            if (err.message === 'Query execution timed out after 60 seconds') {
                // Log specific timeout errors
                console.error('Query timeout:', query);
            }
            console.log(err);
            throw err;
        }

    }
    //  END SDA CUSTOM

    async execSqlQuery(query: string): Promise<any> {
        return this.execQuery(query);
    }


    async getQueryBuilded(queryData: any, dataModel: any, user: any) {
        this.queryBuilder = new MySqlBuilderService(queryData, dataModel, user);
        return this.queryBuilder.builder();
    }

    BuildSqlQuery(queryData: any, dataModel: any, user: any){
        this.queryBuilder = new MySqlBuilderService(queryData, dataModel, user);
        return this.queryBuilder.sqlBuilder(queryData, queryData.filters);
    }

    private async countTable(tableName: string): Promise<any> {
        const query = `
        SELECT count(*) as count from ${tableName} 
        `;
        return new Promise(async (resolve, reject) => {
            try {
                const count = await this.client.query(query);
                resolve(count);
            } catch (err) {
                reject(err);
            }
        })
    }

    private async setTable(tableName: string): Promise<any> {
        const query = `
                    SELECT COLUMN_NAME AS column_name, DATA_TYPE AS column_type
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = '${this.config.database}' AND TABLE_NAME = '${tableName}';  
    `;

        return new Promise(async (resolve, reject) => {
            try {
                //this.client = createConnection(this.config);
                const getColumns = await this.client.query(query);
                const newTable = {
                    table_name: tableName,
                    display_name: {
                        "default": this.normalizeName(tableName),
                        "localized": []
                    },
                    description: {
                        "default": `${this.normalizeName(tableName)}`,
                        "localized": []
                    },
                    table_granted_roles: [],
                    table_type: [],
                    columns: getColumns,
                    relations: [],
                    visible: true
                };
                resolve(newTable);
            } catch (err) {
                reject(err);
            }
        });
    }

    private setColumns(c: any, tableCount?:number) {
        let column = c;
        column.display_name = { default: this.normalizeName(column.column_name), localized: [] };
        column.description = { default: this.normalizeName(column.column_name), localized: [] };
        
        const dbType = column.column_type;
        column.column_type = this.normalizeType(dbType) || dbType;
        let floatOrInt =  this.floatOrInt(dbType);
        column.minimumFractionDigits = floatOrInt === 'int' &&  column.column_type === 'numeric' ? 0 
        : floatOrInt === 'float' &&  column.column_type === 'numeric' ? 2 : null;

        if (column.column_type === 'numeric') {
            column.aggregation_type = AggregationTypes.getValuesForNumbers();
        } else if (column.column_type === 'text') {
            column.aggregation_type = AggregationTypes.getValuesForText();
            if (column.column_name === 'CONTACTFIRSTNAME') {
                console.log('set text aggregation type')
                console.log(column);
            }
        } else {
            column.aggregation_type = AggregationTypes.getValuesForOthers();
        }

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

    createTable(queryData: any, user:any): string {

        this.queryBuilder = new MySqlBuilderService(queryData, { ds: { model: { tables: [] } } }, user._id);
        return this.queryBuilder.createTable(queryData);
    }

    generateInserts(queryData: any, user:any): string {
 
        this.queryBuilder = new MySqlBuilderService(queryData, { ds: { model: { tables: [] } } }, user._id);
        return this.queryBuilder.generateInserts(queryData);
    }


}
