import oracledb, { Connection } from 'oracledb';
import { AbstractConnection } from '../abstract-connection';
import { AggregationTypes } from '../../../module/global/model/aggregation-types';
import { OracleBuilderService } from '../../query-builder/qb-systems/oracle-builder.service';

/**
 * WARNING !! La resposta de oracledb dóna problemes de format (objecte, array) ??
 */


export class OracleConnection extends AbstractConnection {

    private queryBuilder: OracleBuilderService;

    constructor(config) {
        super(config);
        if (!this.config.schema) {
            this.config.schema = this.GetDefaultSchema();
        }
    }

    GetDefaultSchema(): string {
        return this.config.user.toUpperCase();
    }

    async getclient() {
        const connectString = parseInt(this.config.sid) === 1 ?
            `(DESCRIPTION =
                (ADDRESS = (PROTOCOL = TCP)(HOST = ${this.config.host})(PORT = ${this.config.port}))
                (CONNECT_DATA =
                    (SERVER = DEDICATED)
                    (SID = ${this.config.database})
                )
            )` : `${this.config.host}/${this.config.database}`;
        oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
        return oracledb.getConnection({
            user: this.config.user,
            password: this.config.password,
            connectString: connectString
        });
    }

    async tryConnection(): Promise<any> {
        try {
            this.client = await this.getclient();
            console.log('\x1b[32m%s\x1b[0m', 'Connecting to Oracle database...\n');
            this.itsConnected();
            console.log('Me he conectado a Oracle correctamente');
        } finally {
            if (this.client) {
                try {
                    await this.client.close();
                } catch (err) {
                    console.error(err.message);
                    throw err;
                }
            }
        }
    }

    async generateDataModel(optimize: number, filter: string): Promise<any> {
        try {
            const tableNames = [];
            const tables = [];

            let whereTableSchema: string = `OWNER = '${this.config.schema}'`;
            /**
           * Set filter for tables if exists
           */
            const filters = filter ? filter.split(',') : []
            let filter_str = filter ? `AND ( TABLE_NAME LIKE '${filters[0].trim()}'` : ``;
            for (let i = 1; i < filters.length; i++) {
                filter_str += ` OR TABLE_NAME LIKE '${filters[i].trim()}'`;
            }
            if (filter) filter_str += ' )';

            let v_filter_str = filter ? `AND ( VIEW_NAME LIKE '${filters[0].trim()}'` : ``;
            for (let i = 1; i < filters.length; i++) {
                v_filter_str += ` OR VIEW_NAME LIKE '${filters[i].trim()}'`;
            }
            if (filter) v_filter_str += ' )';

            /** se quita del filtro ${whereTableSchema} para permitir consultas sobre tablas sobre las que se tiene permiso.  */
            const query = `
              SELECT DISTINCT TABLE_NAME
              FROM ALL_TABLES
              WHERE   ${whereTableSchema} ${filter_str}
              UNION ALL
              SELECT DISTINCT VIEW_NAME
              from sys.all_views
              WHERE ${whereTableSchema} ${v_filter_str}
              ORDER BY 1
            `;

            //console.log(query);

            const getResults = await this.execQuery(query);
            for (let i = 0, n = getResults.length; i < n; i++) {
                const result = getResults[i];
                tableNames.push(result.TABLE_NAME);
            }

            const fkQuery = `
            SELECT
                CHILD.TABLE_NAME         "foreign_table"
            ,   CHILD.COLUMN_NAME        "fk_column"
            ,   PARENT_COLS.TABLE_NAME   "primary_table"
            ,   PARENT_COLS.COLUMN_NAME  "pk_column"
            FROM     ALL_CONS_COLUMNS  CHILD
            ,        ALL_CONSTRAINTS   CT
            ,        ALL_CONSTRAINTS   PARENT
            ,        ALL_CONS_COLUMNS  PARENT_COLS
            WHERE    CHILD.OWNER             = CT.OWNER
            AND      CT.CONSTRAINT_TYPE      = 'R'
            AND      CHILD.CONSTRAINT_NAME   = CT.CONSTRAINT_NAME
            AND      CT.R_OWNER              = PARENT.OWNER
            AND      CT.R_CONSTRAINT_NAME    = PARENT.CONSTRAINT_NAME
            AND      PARENT.CONSTRAINT_NAME  = PARENT_COLS.CONSTRAINT_NAME
            AND      PARENT.OWNER            = PARENT_COLS.OWNER
            AND      CHILD.POSITION          = PARENT_COLS.POSITION
            AND      CT.OWNER  = '${this.config.schema}'
            `

            //console.log(fkQuery);

            const foreignKeys = await this.execQuery(fkQuery);

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
                if (i > 500) {
                    console.log('Un datasource no puede tener más de 500 tablas ');
                    break;
                }
            }

            for (let i = 0; i < tables.length; i++) {
                for (let j = 0; j < tables[i].columns.length; j++) {
                    tables[i].columns[j] = this.setColumns(tables[i].columns[j], tables[i].tableCount);
                }
            }

            /**Return datamodel with foreign-keys-relations if exists or custom relations if not */
            if (foreignKeys.length > 0) return this.setForeignKeys(tables, foreignKeys);
            else return this.setRelations(tables);

        } catch (err) {
            throw err;
        } finally {
            if (this.client) {
                await this.client.close();
            }
        }
    }



    async execQuery(query: string): Promise<any> {
        let client: Connection;
        try {
            client = await this.getclient();
            await client.execute(`alter session set current_schema = ${this.config.schema} `)
            const result = await client.execute(query);
            return result.rows;

        } catch (err) {
            console.log(err);
            throw err;
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (err) {
                    console.error(err);
                }
            }
        }
    }

    /* a les consultes sql cal fer-lis un tractament especial per saber su son numeriques o text*/
    async execSqlQuery(query: string): Promise<any> {
        return this.execQuery(query);
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
        const query = `
        SELECT count(*) as count from ${schema}.${tableName}
        `;
        return this.client.execute(query);
    }

    private async setTable(tableName: string): Promise<any> {
        const query = ` SELECT DISTINCT column_name, data_type
                        FROM ALL_TAB_COLUMNS
                        WHERE table_name = '${tableName}'
                        AND OWNER = '${this.config.schema}'`;

        const getColumns = await this.client.execute(query);
        return {
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
    }

    private setColumns(c: any, tableCount?: number) {
        let column: any = {};
        column.column_name = c.COLUMN_NAME;
        column.display_name = { default: this.normalizeName(c.COLUMN_NAME), localized: [] };
        column.description = { default: this.normalizeName(c.COLUMN_NAME), localized: [] };

        const dbType = c.DATA_TYPE;
        column.column_type = this.normalizeType(dbType) || dbType;
        let floatOrInt = this.floatOrInt(dbType);
        column.minimumFractionDigits = floatOrInt === 'int' && column.column_type === 'numeric' ? 0
            : floatOrInt === 'float' && column.column_type === 'numeric' ? 2 : null;


        if (column.column_type === 'numeric') {
            column.aggregation_type = AggregationTypes.getValuesForNumbers();
        } else if (column.column_type === 'text' || column.column_type === 'html') {
            column.aggregation_type = AggregationTypes.getValuesForText();
        } else {
            column.aggregation_type = AggregationTypes.getValuesForOthers();
        }

        column.computed_column = 'no';   // las posibilidades son no, computed,

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

    createTable(_queryData: any): string {
        throw new Error('Method not implemented.');
    }

    generateInserts(_queryData: any): string {
        throw new Error('Method not implemented.');
    }
}
