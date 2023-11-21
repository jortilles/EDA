import { PgBuilderService } from '../../query-builder/qb-systems/pg-builder-service';
import { AbstractConnection } from '../abstract-connection';
import { AggregationTypes } from '../../../module/global/model/aggregation-types';
import DataSource from '../../../module/datasource/model/datasource.model';
const Vertica = require('vertica');


export class VerticaConnection extends AbstractConnection {
    GetDefaultSchema(): string {
        return 'public';
    }

    private queryBuilder: PgBuilderService;

    async getclient() {
        return new Promise((resolve, reject) => {
            Vertica.connect(this.config, (err, conn) => {
                if (err) {
                    return reject(err);
                }
                return resolve(conn);
            });

        }).catch((err) => {
            throw err;
        });

    }

    async tryConnection(): Promise<any> {
        try {
            console.log('\x1b[32m%s\x1b[0m', 'Connecting to Vertica database...\n');
            this.client = await this.getclient();
            this.itsConnected();
            return this.client;
        } catch (err) {
            console.log(err)
            throw err;
        }
    }

    async generateDataModel(optimize: number, filter:string): Promise<any> {
        try {
            this.client = await this.getclient();
            let tableNames = [];
            let tables = [];

            /**
            * Set filter for tables if exists
            */
            const filters = filter ? filter.split(',') : []
            let filter_str = filter ? `AND ( table_name LIKE '${filters[0].trim()}'` : ``;
            for (let i = 1; i < filters.length; i++) {
                filter_str += ` OR table_name LIKE '${filters[i].trim()}'`
            }
            if (filter) filter_str += ' )';

            /**
             * Query
             */
            const query = `
              SELECT table_name FROM tables WHERE is_system_table = false and table_schema = '${this.config.schema || 'public'}' ${filter_str}
              UNION ALL
              SELECT table_name FROM v_catalog.views WHERE is_system_view = false and table_schema = '${this.config.schema || 'public'}' ${filter_str}`
                ;

            const getResults = await this.execQuery(query);
            getResults.forEach(r => {
                let tableName = r['table_name'];
                tableNames.push(tableName);
            });


            for (let i = 0; i < tableNames.length; i++) {
                let new_table = await this.setTable(tableNames[i]);

                let count = 0;
                if (optimize === 1) {
                    const dbCount = await this.countTable(tableNames[i], `${this.config.schema || 'public'}`);
                    count = dbCount[0].count;
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
            select col.table_name as foreign_table, col.column_name as fk_column, fks.reference_table_name as primary_table, fks.reference_column_name as pk_column
            from v_catalog.columns col
            inner join v_catalog.foreign_keys fks
                    on col.table_schema = fks.table_schema
                    and col.table_name = fks.table_name
                    and col.column_name = fks.column_name
            where col.table_schema = '${this.config.schema || 'public'}'
            order by col.table_schema,
                    col.table_name,
                    col.ordinal_position;
            `;

            const foreignKeys = await this.execQuery(fkQuery);
            /**Return datamodel with foreign-keys-relations if exists or custom relations if not */
            if (foreignKeys.length > 0) return await this.setForeignKeys(tables, foreignKeys);
            else return await this.setRelations(tables);

        } catch (err) {
            throw err;
        }
    }

    async execQuery(query: string): Promise<any> {
        let connection: { query: (arg0: string, arg1: (err: any, resultset: any) => void) => void; };
        connection = this.client;
        return new Promise(async (resolve, reject) => {
            connection.query(query, (err, resultset) => {
                if (err) {
                    return reject(err);
                }
                let rows = this.mapToJSON(resultset);
                resolve(rows);
            });
        }).catch(err => { throw err });
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
            this.client.query(query, (err, resultset) => {
                if (err) {
                    return resolve([{ count: 0 }]);
                }
                let rows = this.mapToJSON(resultset);
                resolve(rows);
            });
        })
    }

    private async setTable(tableName: string): Promise<any> {
        const query = `
        select column_name, data_type from v_catalog.columns WHERE table_name = '${tableName}' and table_schema = '${this.config.schema || 'public'}'
        UNION
        SELECT column_name, data_type from view_columns WHERE table_name = '${tableName}' and table_schema = '${this.config.schema || 'public'}'
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

    private setColumns(c: any, tableCount: number) {
        let column = c;

        column.display_name = { default: this.normalizeName(column.column_name), localized: [] };
        column.description = { default: this.normalizeName(column.column_name), localized: [] };

        const dbType = column.data_type;
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


    private mapToJSON = (dbResult) => {
        const fieldNames = dbResult.fields.map(field => field.name) // List of all field names
        return dbResult.rows.map(row => {
            return row.reduce((obj, item, index) => {
                const header = fieldNames[index]
                obj[header] = item
                return obj
            }, {})
        })
    }

    createTable(queryData: any): string {
        throw new Error('Method not implemented.');
    }
    generateInserts(queryData: any): string {
        throw new Error('Method not implemented.');
    }
}
