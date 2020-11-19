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

    async getPool() {
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
            const query = `
              SELECT table_name FROM tables WHERE is_system_table = false and table_schema = '${this.config.schema || 'public'}'
              UNION ALL
              SELECT table_name FROM v_catalog.views WHERE is_system_view = false and table_schema = '${this.config.schema || 'public'}'`
                ;

            const getResults = await this.execQuery(query);
            getResults.forEach(r => {
                let tableName = r['table_name'];
                tableNames.push(tableName);
            });

            for (let i = 0; i < tableNames.length; i++) {
                let new_table = await this.setTable(tableNames[i]);

                let count = 0;
                if(optimize === '1'){
                    const dbCount = await this.countTable(tableNames[i], `${this.config.schema || 'public'}`);
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
            return await this.commonColumns(tables);
        } catch (err) {
            throw err;
        }
    }

    async execQuery(query: string): Promise<any> {
        let connection: { query: (arg0: string, arg1: (err: any, resultset: any) => void) => void; };
        connection = this.pool;
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

    async getDataSource(id: string) {
        try {
            return await DataSource.findOne({ _id: id }, (err, datasource) => {
                if (err) {
                    throw Error(err);
                }
                return datasource;
            });
        } catch (err) {
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


    private async countTable(tableName: string, schema: string): Promise<any> {
        const query = `
        SELECT count(*) as count from ${schema}.${tableName}
        `;
        return new Promise(async (resolve, reject) => {
            this.pool.query(query, (err, resultset) => {
                if (err) {
                    return resolve({count:0});
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

    private setColumns(c, tableCount:number) {
        let column = c;

        column.display_name = { default: this.normalizeName(column.column_name), localized: [] };
        column.description = { default: this.normalizeName(column.column_name), localized: [] };
        column.column_type = this.normalizeType(column.data_type) || column.data_type;

        column.column_type === 'numeric'
            ? column.aggregation_type = AggregationTypes.getValues()
            : column.aggregation_type = [{ value: 'none', display_name: 'no' }];

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
