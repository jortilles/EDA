import * as duckdb from 'duckdb';
import * as path from 'path';
import * as fs from 'fs';
import { DuckDBBuilderService } from '../../query-builder/qb-systems/duckdb-builder.service';
import { AbstractConnection } from '../abstract-connection';
import { AggregationTypes } from '../../../module/global/model/aggregation-types';

export class DuckDBConnection extends AbstractConnection {

    GetDefaultSchema(): string {
        return 'main';
    }

    private queryBuilder: DuckDBBuilderService;

    private getCsvFolder(): string {
        const database = this.config.database;
        const duckdbBase = path.join(process.cwd(), 'duckdb');

        // Legacy absolute paths (created on another machine): extract only the folder name
        if (database && (path.isAbsolute(database) || database.includes('\\') || database.includes('/'))) {
            const folderName = path.basename(database);
            if (!folderName) throw new Error(`[DuckDB] Cannot resolve CSV folder from path: "${database}"`);
            return path.join(duckdbBase, folderName);
        }

        // Normal case: database is just the folder name (e.g. "ajuntamentderubi")
        if (database && database !== ':memory:') {
            return path.join(duckdbBase, database);
        }

        throw new Error(`[DuckDB] datasource has no valid folder configured (database="${database}"). Each DuckDB datasource must point to a subfolder inside duckdb/.`);
    }

    async getclient(): Promise<duckdb.Database> {
        try {
            return new duckdb.Database(':memory:');
        } catch (err) {
            throw err;
        }
    }

    private async registerCsvFiles(conn: duckdb.Connection): Promise<void> {
        const folder = this.getCsvFolder();
        console.log(`[DuckDB] registerCsvFiles → folder: "${folder}"`);

        if (!fs.existsSync(folder)) {
            console.error(`[DuckDB] folder does not exist: "${folder}"`);
            return;
        }

        const csvFiles = fs.readdirSync(folder).filter(f => f.toLowerCase().endsWith('.csv'));
        console.log(`[DuckDB] CSV files found: [${csvFiles.join(', ')}]`);

        // Sequential execution: DuckDB 1.4.x may have race conditions with parallel DDL on the same connection
        for (const file of csvFiles) {
            const tableName = path.basename(file, path.extname(file));
            const filePath = path.join(folder, file).replace(/\\/g, '/');
            await new Promise<void>((resolve, reject) => {
                conn.run(
                    `CREATE OR REPLACE VIEW "${tableName}" AS SELECT * FROM read_csv_auto('${filePath}')`,
                    (err) => {
                        if (err) {
                            console.error(`[DuckDB] Error creating view "${tableName}": ${err.message}`);
                            reject(err);
                        } else {
                            console.log(`[DuckDB] View "${tableName}" ready`);
                            resolve();
                        }
                    }
                );
            });
        }
    }

    private runQuery(conn: duckdb.Connection, query: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            conn.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(this.serializeRows(rows));
            });
        });
    }

    // DuckDB returns COUNT/SUM aggregates as BigInt which JSON.stringify can't serialize.
    private serializeRows(rows: any[]): any[] {
        return rows.map(row => {
            const out: any = {};
            for (const key of Object.keys(row)) {
                const val = row[key];
                out[key] = typeof val === 'bigint' ? Number(val) : val;
            }
            return out;
        });
    }

    async tryConnection(): Promise<any> {
        let db: duckdb.Database;
        try {
            db = await this.getclient();
            const conn = db.connect();
            await this.registerCsvFiles(conn);
            this.itsConnected();
        } catch (err) {
            throw err;
        } finally {
            if (db) db.close();
        }
    }

    async execQuery(query: string): Promise<any> {
        let db: duckdb.Database;
        try {
            db = await this.getclient();
            const conn = db.connect();
            await this.registerCsvFiles(conn);
            return await this.runQuery(conn, query);
        } catch (err) {
            console.log(err);
            throw err;
        } finally {
            if (db) db.close();
        }
    }

    async execSqlQuery(query: string): Promise<any> {
        return this.execQuery(query);
    }

    async generateDataModel(optimize: number, filter: string): Promise<any> {
        let db: duckdb.Database;
        try {
            db = await this.getclient();
            const conn = db.connect();
            await this.registerCsvFiles(conn);

            const filters = filter ? filter.split(',').map(f => f.trim()) : [];

            const tableRows = await this.runQuery(conn, 'SHOW TABLES');
            let tableNames: string[] = tableRows.map(r => r.name);

            if (filters.length > 0) {
                tableNames = tableNames.filter(name =>
                    filters.some(f => name.includes(f.replace(/%/g, '')))
                );
            }

            const tables = [];
            for (const tableName of tableNames) {
                const columns = await this.runQuery(conn, `DESCRIBE "${tableName}"`);
                const newTable = {
                    table_name: tableName,
                    display_name: { default: this.normalizeName(tableName), localized: [] },
                    description: { default: this.normalizeName(tableName), localized: [] },
                    table_granted_roles: [],
                    table_type: [],
                    columns: columns.map(col => ({
                        column_name: col.column_name,
                        column_type: col.column_type
                    })),
                    relations: [],
                    visible: true,
                    ia_visibility: 'FULL',
                    tableCount: 0
                };

                if (optimize === 1) {
                    try {
                        const countRows = await this.runQuery(conn, `SELECT count(*) AS count FROM "${tableName}"`);
                        newTable.tableCount = Number(countRows[0].count);
                    } catch (e) {
                        console.log(`Table ${tableName} could not be counted.`);
                    }
                }

                for (let j = 0; j < newTable.columns.length; j++) {
                    newTable.columns[j] = this.setColumns(newTable.columns[j], newTable.tableCount);
                }

                tables.push(newTable);
            }

            return await this.setRelations(tables);
        } catch (err) {
            throw err;
        } finally {
            if (db) db.close();
        }
    }

    async getQueryBuilded(queryData: any, dataModel: any, user: any) {
        if (!dataModel.ds.connection.schema) dataModel.ds.connection.schema = 'main';
        this.queryBuilder = new DuckDBBuilderService(queryData, dataModel, user);
        return this.queryBuilder.builder();
    }

    BuildSqlQuery(queryData: any, dataModel: any, user: any): string {
        if (!dataModel.ds.connection.schema) dataModel.ds.connection.schema = 'main';
        this.queryBuilder = new DuckDBBuilderService(queryData, dataModel, user);
        return this.queryBuilder.sqlBuilder(queryData, queryData.filters);
    }

    createTable(queryData: any, user: any): string {
        this.queryBuilder = new DuckDBBuilderService(queryData, { ds: { model: { tables: [] } } }, user._id);
        return this.queryBuilder.createTable(queryData);
    }

    generateInserts(queryData: any, user: any): string {
        this.queryBuilder = new DuckDBBuilderService(queryData, { ds: { model: { tables: [] } } }, user._id);
        return this.queryBuilder.generateInserts(queryData);
    }

    private normalizeName(name: string): string {
        return name.split('_').join(' ')
            .toLowerCase()
            .split(' ')
            .map(s => s.charAt(0).toUpperCase() + s.substring(1))
            .join(' ');
    }

    private setColumns(c: any, tableCount?: number) {
        const column = c;

        column.display_name = { default: this.normalizeName(column.column_name), localized: [] };
        column.description = { default: this.normalizeName(column.column_name), localized: [] };

        const dbType = column.column_type;
        column.column_type = this.normalizeType(dbType) || dbType;
        const floatOrInt = this.floatOrInt(dbType);
        column.minimumFractionDigits =
            floatOrInt === 'int' && column.column_type === 'numeric' ? 0
            : floatOrInt === 'float' && column.column_type === 'numeric' ? 2
            : null;

        if (column.column_type === 'numeric') {
            column.aggregation_type = AggregationTypes.getValuesForNumbers();
        } else if (column.column_type === 'text' || column.column_type === 'html') {
            column.aggregation_type = AggregationTypes.getValuesForText();
        } else {
            column.aggregation_type = AggregationTypes.getValuesForOthers();
        }

        column.computed_column = 'no';
        column.column_granted_roles = [];
        column.row_granted_roles = [];
        column.visible = true;
        column.ia_visibility = 'FULL';
        column.tableCount = tableCount || 0;

        return column;
    }
}
