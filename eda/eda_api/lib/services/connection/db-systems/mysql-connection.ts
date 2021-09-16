import { MysqlError, createConnection, Connection as SqlConnection } from 'mysql';
import { MySqlBuilderService } from "../../query-builder/qb-systems/mySql-builder.service";
import { AbstractConnection } from "../abstract-connection";
import DataSource from '../../../module/datasource/model/datasource.model';
import { AggregationTypes } from "../../../module/global/model/aggregation-types";
const util = require('util');


export class MysqlConnection extends AbstractConnection {
    GetDefaultSchema(): string {
        return null;
    }
    private queryBuilder: MySqlBuilderService;
    private AggTypes: AggregationTypes;

    async getclient() {
        return createConnection(this.config);
    }

    async tryConnection(): Promise<any> {
        try {
            return new Promise((resolve, reject) => {
                this.client = createConnection(this.config);
                console.log('\x1b[32m%s\x1b[0m', 'Connecting to MySQL database...\n');
                this.client.connect((err: MysqlError, connection: SqlConnection) => {
                    if (err) {
                        return reject(err);
                    }
                    if (connection) {
                        this.itsConnected();
                        this.client.end();
                        return resolve(connection);
                    }
                });
            })

        } catch (err) {
            throw err;
        }
    }

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
             let filter_str = filter ? `AND ( table_name LIKE '%${filters[0].trim()}%'` : ``;
             for (let i = 1; i < filters.length; i++) {
                 filter_str += ` OR table_name LIKE '%${filters[i].trim()}%'`;
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
            }

            for (let i = 0; i < tables.length; i++) {
                for (let j = 0; j < tables[i].columns.length; j++) {
                    tables[i].columns[j] = this.setColumns(tables[i].columns[j], tables[i].tableCount);
                }
            }
            this.client.end();
            
            /**Return datamodel with foreign-keys-relations if exists or custom relations if not */
            if(foreignKeys.length > 0) return await this.setForeignKeys(tables, foreignKeys);
            else return await this.setRelations(tables);

        } catch (err) {
            throw err;
        }
    }

    async execQuery(query: string): Promise<any> {
        try {
            this.client.query = util.promisify(this.client.query);
            const rows = await this.client.query(query);
            this.client.end();
            return rows;
        } catch (err) {
            console.log(err);
            throw err;
        }

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

    private setColumns(c, tableCount?:number) {
        let column = c;
        column.display_name = { default: this.normalizeName(column.column_name), localized: [] };
        column.description = { default: this.normalizeName(column.column_name), localized: [] };
        
        const dbType = column.column_type;
        column.column_type = this.normalizeType(dbType) || dbType;
        let floatOrInt =  this.floatOrInt(dbType);
        column.minimumFractionDigits = floatOrInt === 'int' &&  column.column_type === 'numeric' ? 0 
        : floatOrInt === 'float' &&  column.column_type === 'numeric' ? 2 : null;

        column.column_type === 'numeric'
            ? column.aggregation_type = AggregationTypes.getValues()
            : column.aggregation_type = [{ value: 'none', display_name: 'no' }];

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


    createTable(queryData: any): string {
        throw new Error('Method not implemented.');
    }
    generateInserts(queryData:any):string {
        throw new Error('Method not implemented.');
    }
}
