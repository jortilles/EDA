import { Client as PgClient } from 'pg';
import { PgBuilderService } from '../../query-builder/qb-systems/pg-builder-service';
import { AbstractConnection } from '../abstract-connection';
import { AggregationTypes } from '../../../module/global/model/aggregation-types';

var types = require('pg').types;
types.setTypeParser(1700, 'text', parseFloat);


export class PgConnection extends AbstractConnection {

    GetDefaultSchema(): string {
        return 'public';
    }

    private queryBuilder: PgBuilderService;
    private AggTypes: AggregationTypes;

    async getclient() {
        try {
            const connection = new PgClient(this.config);
            return connection;
        } catch (err) {
            throw err;
        }
    }

    async tryConnection(): Promise<any> {
        try {
            this.client = await this.getclient();
            console.log('\x1b[32m%s\x1b[0m', 'Connecting to PostgreSQL database...\n');
            await this.client.connect();
            this.itsConnected();
            await this.client.end();
            return;
        } catch (err) {
            throw err;
        }
    }

    async generateDataModel(optimize: number, filter: string): Promise<any> {
        try {
            this.client = await this.getclient();
            let tableNames = [];
            const tables = [];

            /**
             * Set filter for tables if exists
             */
            const filters = filter ? filter.split(',') : []
            let filter_str = filter ? `AND ( table_name LIKE '${filters[0].trim()}'` : ``;
            for (let i = 1; i < filters.length; i++) {
                filter_str += ` OR table_name LIKE '${filters[i].trim()}'`
            }
            if(filter) filter_str += ' )';

            /**
             * Build query
             */
            let whereTableSchema: string = !this.config.schema
                ? `NOT IN ('pg_catalog', 'information_schema')`
                : `=  '${this.config.schema}' `
                ;
            const query = `
            SELECT distinct table_name from 
               ( 
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_type = 'BASE TABLE' AND table_schema ${whereTableSchema} ${filter_str}
                    UNION ALL
                    SELECT table_name 
                    FROM  information_schema.views 
                    WHERE table_schema ${whereTableSchema} ${filter_str}
                ) t
            `;

            /**Get tables */
            tableNames = await this.execQuery(query).then(res => res.map(row => row.table_name));

            /*
            for (let i = 0, n = getResults.length; i < n; i++) {
                const result = getResults[i];
                tableNames.push(result['table_name']);
            }
            */

            /**Get foreign keys */
            const fkQuery = this.getForeignKeysQuery();
            this.client = await this.getclient();
            const foreignKeys = await this.execQuery(fkQuery);

            // New client is needed, old client has been closed;
            this.client = await this.getclient();
            this.client.connect();

            /**Set tables */
            for (let i = 0; i < tableNames.length; i++) {
                let new_table = await this.setTable(tableNames[i]);
                let count = 0;
                if (optimize === 1) {
                    const dbCount = await this.countTable(tableNames[i], `${this.config.schema || 'public'}`);
                    count = dbCount.rows[0].count;
                }
                new_table.tableCount = count;
                tables.push(new_table);
                if(i> 500){
                    console.log('Un datasource no puede tener más de 500 tablas ');
                    i = tableNames.length + 1;
                }
            }
            /**Set columns */
            for (let i = 0; i < tables.length; i++) {
                for (let j = 0; j < tables[i].columns.length; j++) {
                    tables[i].columns[j] = this.setColumns(tables[i].columns[j], tables[i].tableCount);
                }
            }

            this.client.end();

            /**Return datamodel with foreign-keys-relations if exists or custom relations if not */
            if (foreignKeys.length > 0) return await this.setForeignKeys(tables, foreignKeys);
            else return await this.setRelations(tables);


        } catch (err) {
            throw err;
        }
    }

    async execQuery(query: string): Promise<any> {
        let client: { connect: () => void; query: (arg0: string) => any; end: () => void; };
        try {
            client = this.client;
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

    
    async execSqlQuery(query: string): Promise<any> {
        return this.execQuery(query);
    }



    async getQueryBuilded(queryData: any, dataModel: any, user: any) {
        this.queryBuilder = new PgBuilderService(queryData, dataModel, user);
        return this.queryBuilder.builder();
    }

    BuildSqlQuery(queryData: any, dataModel: any, user: any): string {
        this.queryBuilder = new PgBuilderService(queryData, dataModel, user);
        return this.queryBuilder.sqlBuilder(queryData, queryData.filters);
    }


    private async countTable(tableName: string, schema: string): Promise<any> {
        const query = `
        SELECT count(*) as count from ${schema}.${tableName}
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

    private async setTable(tableName: string ): Promise<any> {
        const query = `SELECT column_name, udt_name AS column_type ` +
        `FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = '${tableName}' ` + 
        `and table_schema = '${this.config.schema || 'public'}' `;
        return new Promise(async (resolve, reject) => {
            try {
                const getColumns = await this.client.query(query);
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

        column.computed_column == 'no'   // las posibilidades son no, computed, 

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

        this.queryBuilder = new PgBuilderService(queryData, { ds: { model: { tables: [] } } }, user._id);
        return this.queryBuilder.createTable(queryData);
    }

    generateInserts(queryData: any, user:any): string {
 
        this.queryBuilder = new PgBuilderService(queryData, { ds: { model: { tables: [] } } }, user._id);
        return this.queryBuilder.generateInserts(queryData);
    }

    getForeignKeysQuery() {

        return `select kcu.table_name as foreign_table, rel_kcu.table_name as primary_table, kcu.column_name as fk_column, rel_kcu.column_name as pk_column
            from information_schema.table_constraints tco
            join information_schema.key_column_usage kcu
               on tco.constraint_schema = kcu.constraint_schema
               and tco.constraint_name = kcu.constraint_name
            join information_schema.referential_constraints rco
               on tco.constraint_schema = rco.constraint_schema
               and tco.constraint_name = rco.constraint_name
            join information_schema.key_column_usage rel_kcu
               on rco.unique_constraint_schema = rel_kcu.constraint_schema
               and rco.unique_constraint_name = rel_kcu.constraint_name
               and kcu.ordinal_position = rel_kcu.ordinal_position
            where tco.constraint_type = 'FOREIGN KEY'
            order by kcu.table_schema,  kcu.table_name, kcu.ordinal_position;`

    }



}
