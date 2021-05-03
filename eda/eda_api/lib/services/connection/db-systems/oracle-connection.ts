import * as oracledbTypes from 'oracledb';
import { AbstractConnection } from '../abstract-connection';
import { AggregationTypes } from '../../../module/global/model/aggregation-types';
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

    async getclient() {

        try {
            const connectString = parseInt(this.config.sid) === 1 ? 
                `(DESCRIPTION =
                    (ADDRESS = (PROTOCOL = TCP)(HOST = ${this.config.host})(PORT = ${this.config.port}))
                    (CONNECT_DATA =
                        (SERVER = DEDICATED)
                        (SID = ${this.config.database})
                    )
                )` : `${this.config.host}/${this.config.database}`;

            const client = await oracledb.createPool({
                user: this.config.user,
                password: this.config.password,
                connectString: connectString
            });
            const connection = await client.getConnection();

            return connection;

        } catch (err) {
            console.error(err.message);
        }
    }

    async tryConnection(): Promise<any> {
        try {
            this.client = await this.getclient();
            console.log('\x1b[32m%s\x1b[0m', 'Connecting to Oracle database...\n');
            this.itsConnected();
        } catch (err) {
            throw err;
        } finally {
            if (this.client) {
                try {
                    await this.client.close();
                } catch (err) {
                    console.error(err.message);
                }
            }
        }
    }

    async generateDataModel(optimize:number): Promise<any> {
        try {
            // this.client = await this.getclient();
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

            const fkQuery = `
            SELECT   PARENT.TABLE_NAME  "primary_table"
            ,        PARENT.CONSTRAINT_NAME  "pk_column"
            ,        CHILD.TABLE_NAME  "foreign_table"
            ,        CHILD.COLUMN_NAME  "fk_column"
            FROM     ALL_CONS_COLUMNS   CHILD
            ,        ALL_CONSTRAINTS   CT
            ,        ALL_CONSTRAINTS   PARENT
            WHERE    CHILD.OWNER  =  CT.OWNER
            AND      CT.CONSTRAINT_TYPE  = 'R'
            AND      CHILD.CONSTRAINT_NAME  =  CT.CONSTRAINT_NAME 
            AND      CT.R_OWNER  =  PARENT.OWNER
            AND      CT.R_CONSTRAINT_NAME  =  PARENT.CONSTRAINT_NAME 
            AND      CT.OWNER  = '${this.config.schema}'
            `
            this.client = await this.getclient();
            const foreignKeys = await this.execQuery(fkQuery);

            // New client is needed, old client has been closed;
            this.client = await this.getclient();
            for (let i = 0; i < tableNames.length; i++) {
                let new_table = await this.setTable(tableNames[i]);
                let count = 0;
                if (optimize === 1) {
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

            /**Return datamodel with foreign-keys-relations if exists or custom relations if not */
            if(foreignKeys.length > 0) return await this.setForeignKeys(tables, foreignKeys);
            else return await this.getRelations(tables);

        } catch (err) {
            throw err;
        } finally {
            if (this.client) {
                this.client.close();
            }
        }
    }

    async execQuery(query: string): Promise<any> {
        let client: oracledbTypes.Connection;
        try {
            client = await this.getclient();
            
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

    async getQueryBuilded(queryData: any, dataModel: any, user: any) {
        this.queryBuilder = new OracleBuilderService(queryData, dataModel, user);
        return this.queryBuilder.builder();
    }

    BuildSqlQuery(queryData: any, dataModel: any, user: any): string {
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
                const count = await this.client.execute(query);
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
                const getColumns = await this.client.execute(query);
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

        const dbType = c[1];
        column.column_type = this.normalizeType(dbType) || dbType;
        let floatOrInt =  this.floatOrInt(dbType);
        column.minimumFractionDigits = floatOrInt === 'int' &&  column.column_type === 'numeric' ? 0 
        : floatOrInt === 'float' &&  column.column_type === 'numeric' ? 2 : null;


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
    createTable(queryData: any): string {
        throw new Error('Method not implemented.');
    }
    generateInserts(queryData:any):string {
        throw new Error('Method not implemented.');
    }
}
