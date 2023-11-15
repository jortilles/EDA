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
    async getclient(): Promise<any> {
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

        const client = new SQLservice.ConnectionPool(config);

        return new Promise((resolve, reject) => {
            client.connect((err, conn) => {
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
            this.client = await this.getclient();
            this.itsConnected();
            return this.client;
        } catch (err) {
            console.log(err)
            throw err;
        }
    }

    async generateDataModel(optimize: number, filter: string): Promise<any> {
        try {
            this.client = await this.getclient();
            let tableNames = [];
            let tables = [];
            let where: string = '';
            let schema = this.config.schema;

            if (!schema) {
                schema = 'dbo';
            }
            where = ` AND TABLE_SCHEMA = '${schema}'`;

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
                SELECT TABLE_NAME from INFORMATION_SCHEMA.TABLES WHERE TABLE_tYPE = 'BASE TABLE' ${where} ${filter_str}
                UNION ALL
                SELECT TABLE_NAME from INFORMATION_SCHEMA.VIEWS v WHERE 1=1 ${where}  ${filter_str}
                ORDER BY TABLE_NAME 
            `;

            const getResults = await this.execQuery(query);
            getResults.forEach(r => {
                let tableName = r['TABLE_NAME'];
                tableNames.push(tableName);
            });

            for (let i = 0; i < tableNames.length; i++) {

                let new_table = await this.setTable(tableNames[i]);
                let count = 0;
                if (optimize === 1) {
                    const dbCount = await this.countTable(tableNames[i], `${this.config.schema || 'dbo'}`);
                    count = dbCount.recordset[0].count;
                }
                new_table.tableCount = count;
                tables.push(new_table);
                if(i> 500){
                    console.log('Un datasource no puede tener más de 500 tablas ');
                    i = tableNames.length + 1;
                }
            }

            for (let i = 0; i < tables.length; i++) {
                for (let j = 0; j < tables[i].columns.length; j++) {
                    tables[i].columns[j] = this.setColumns(tables[i].columns[j], tables[i].tableCount);
                }
            }

            /**Foreign keys */

            const fkQuery = `
            select tab.name as foreign_table, col.name as fk_column, pk_tab.name as primary_table, pk_col.name as pk_column
            from sys.tables tab
            inner join sys.columns col 
                on col.object_id = tab.object_id
            left outer join sys.foreign_key_columns fk_cols
                on fk_cols.parent_object_id = tab.object_id
                and fk_cols.parent_column_id = col.column_id
            left outer join sys.foreign_keys fk
                on fk.object_id = fk_cols.constraint_object_id
            left outer join sys.tables pk_tab
                on pk_tab.object_id = fk_cols.referenced_object_id
            left outer join sys.columns pk_col
                on pk_col.column_id = fk_cols.referenced_column_id
                and pk_col.object_id = fk_cols.referenced_object_id
            where fk.name is not null
            and schema_name(tab.schema_id) = '${schema}'
            order by schema_name(tab.schema_id) + '.' + tab.name,
            col.column_id`;

            const foreignKeys = await this.execQuery(fkQuery);

            /**Return datamodel with foreign-keys-relations if exists or custom relations if not */
            if (foreignKeys.length > 0) return await this.setForeignKeys(tables, foreignKeys);
            else return await this.setRelations(tables);

        } catch (err) {
            throw err;
        } finally {
            this.client.close();
        }
    }

    async execQuery(query: string): Promise<any> {
        let connection: { query: (arg0: string, arg1: (err: any, resultset: any) => void) => void; };
        connection = this.client;
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



    async execSqlQuery(query: string): Promise<any> {
        return this.execQuery(query);
    }


    
    getQueryBuilded(queryData: any, dataModel: any, user: any): Promise<any> {
        this.queryBuilder = new SQLserviceBuilderService(queryData, dataModel, user);
        return this.queryBuilder.builder();
    }

    BuildSqlQuery(queryData: any, dataModel: any, user: any): string {
        this.queryBuilder = new SQLserviceBuilderService(queryData, dataModel, user);
        return this.queryBuilder.sqlBuilder(queryData, queryData.filters);
    }


    private async countTable(tableName: string, schema: string): Promise<any> {
        const query = `SELECT count(*) as count from ${schema}.${tableName}`;

        return new Promise(async (resolve, reject) => {
            try {
                const count = await this.client.query(query);
                resolve(count);
            } catch (err) {
                console.log(err)
                resolve({ recordset: [0] })
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

    private setColumns(c: any, tableCount?: number) {
        let column = c;

        column.display_name = { default: this.normalizeName(column.column_name), localized: [] };
        column.description = { default: this.normalizeName(column.column_name), localized: [] };

        const dbType = column.column_type;
        column.column_type = this.normalizeType(dbType) || dbType;
        let floatOrInt = this.floatOrInt(dbType);
        column.minimumFractionDigits = floatOrInt === 'int' && column.column_type === 'numeric' ? 0
            : floatOrInt === 'float' && column.column_type === 'numeric' ? 2 : null;

        if (column.column_type === 'numeric') {
            column.aggregation_type = AggregationTypes.getValuesForNumbers();
        } else if (column.column_type === 'text') {
            column.aggregation_type = AggregationTypes.getValuesForText();
        } else {
            column.aggregation_type = AggregationTypes.getValuesForOthers();
        }

        column.column_granted_roles = [];
        column.row_granted_roles = [];
        column.visible = true;
        column.tableCount = tableCount;
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
    generateInserts(queryData: any): string {
        throw new Error('Method not implemented.');
    }
}