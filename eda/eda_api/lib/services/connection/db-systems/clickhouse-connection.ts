import { createClient } from '@clickhouse/client';
import { ClickHouseBuilderService } from '../../query-builder/qb-systems/clickhouse-builder-service';
import { AbstractConnection } from '../abstract-connection';
import { AggregationTypes } from '../../../module/global/model/aggregation-types';

export class ClickHouseConnection extends AbstractConnection {

    GetDefaultSchema(): string {
        return 'default';
    }

    private queryBuilder: ClickHouseBuilderService;

    private getDatabase(): string {
        return this.config.database || this.config.schema || 'default';
    }

    async getclient(): Promise<any> {
        try {
            const protocol = this.config.ssl ? 'https' : 'http';
            const port = this.config.port || 8123;
            const client = createClient({
                host: `${protocol}://${this.config.host}:${port}`,
                username: this.config.user,
                password: this.config.password,
                database: this.getDatabase(),
            });
            return client;
        } catch (err) {
            throw err;
        }
    }

    async tryConnection(): Promise<any> {
        let client: any;
        try {
            client = await this.getclient();
            console.log('\x1b[32m%s\x1b[0m', 'Connecting to ClickHouse database...\n');
            const result = await client.query({ query: 'SELECT 1', format: 'JSONEachRow' });
            await result.json();
            this.itsConnected();
            await client.close();
            return;
        } catch (err) {
            if (client) await client.close().catch(() => {});
            throw err;
        }
    }

    async generateDataModel(optimize: number, filter: string): Promise<any> {
        const client = await this.getclient();
        try {
            const database = this.getDatabase();
            const tables = [];

            const filters = filter ? filter.split(',') : [];
            let filterStr = '';
            if (filters.length > 0) {
                filterStr = `AND (name LIKE '${filters[0].trim()}'`;
                for (let i = 1; i < filters.length; i++) {
                    filterStr += ` OR name LIKE '${filters[i].trim()}'`;
                }
                filterStr += ')';
            }

            const tablesQuery = `
                SELECT name FROM system.tables
                WHERE database = '${database}'
                AND engine NOT IN ('MaterializedView', 'Kafka', 'RabbitMQ', 'NATS', 'Null')
                ${filterStr}
            `;

            const tablesResult = await client.query({ query: tablesQuery, format: 'JSONEachRow' });
            const tableRows: Array<{ name: string }> = await tablesResult.json();
            const tableNames = tableRows.map(r => r.name);

            for (let i = 0; i < tableNames.length; i++) {
                if (i > 500) {
                    console.log('Un datasource no puede tener más de 500 tablas');
                    break;
                }
                let newTable = await this.setTable(tableNames[i], database, client);
                let count = 0;
                if (optimize === 1) {
                    try {
                        const countResult = await client.query({
                            query: `SELECT count() AS count FROM \`${database}\`.\`${tableNames[i]}\``,
                            format: 'JSONEachRow'
                        });
                        const countRows: Array<{ count: string }> = await countResult.json();
                        count = parseInt(countRows[0]?.count || '0', 10);
                    } catch (e) {
                        console.log('La tabla ' + tableNames[i] + ' no se puede consultar. No se añade al conteo.');
                    }
                }
                newTable.tableCount = count;
                tables.push(newTable);
            }

            for (let i = 0; i < tables.length; i++) {
                for (let j = 0; j < tables[i].columns.length; j++) {
                    tables[i].columns[j] = this.setColumns(tables[i].columns[j], tables[i].tableCount);
                }
            }

            await client.close();

            // ClickHouse does not support foreign keys; use auto-detected relations
            return await this.setRelations(tables);

        } catch (err) {
            await client.close().catch(() => {});
            throw err;
        }
    }

    async execQuery(query: string): Promise<any> {
        const client = await this.getclient();
        try {
            const result = await client.query({ query, format: 'JSONEachRow' });
            const rows = await result.json();
            await client.close();
            return rows;
        } catch (err) {
            console.log(err);
            await client.close().catch(() => {});
            throw err;
        }
    }

    async execSqlQuery(query: string): Promise<any> {
        return this.execQuery(query);
    }

    async getQueryBuilded(queryData: any, dataModel: any, user: any): Promise<any> {
        this.queryBuilder = new ClickHouseBuilderService(queryData, dataModel, user);
        return this.queryBuilder.builder();
    }

    BuildSqlQuery(queryData: any, dataModel: any, user: any): string {
        this.queryBuilder = new ClickHouseBuilderService(queryData, dataModel, user);
        return this.queryBuilder.sqlBuilder(queryData, queryData.filters);
    }

    createTable(queryData: any, user: any): string {
        this.queryBuilder = new ClickHouseBuilderService(queryData, { ds: { model: { tables: [] } } }, user._id);
        return this.queryBuilder.createTable(queryData);
    }

    generateInserts(queryData: any, user: any): string {
        this.queryBuilder = new ClickHouseBuilderService(queryData, { ds: { model: { tables: [] } } }, user._id);
        return this.queryBuilder.generateInserts(queryData);
    }

    private async setTable(tableName: string, database: string, client: any): Promise<any> {
        const columnsQuery = `
            SELECT name AS column_name, type AS column_type
            FROM system.columns
            WHERE database = '${database}' AND table = '${tableName}'
        `;
        const result = await client.query({ query: columnsQuery, format: 'JSONEachRow' });
        const columns: Array<{ column_name: string; column_type: string }> = await result.json();

        return {
            table_name: tableName,
            display_name: {
                default: this.normalizeName(tableName),
                localized: []
            },
            description: {
                default: this.normalizeName(tableName),
                localized: []
            },
            table_granted_roles: [],
            table_type: [],
            columns: columns,
            relations: [],
            visible: true
        };
    }

    private setColumns(c: any, tableCount?: number) {
        const column = c;

        column.display_name = { default: this.normalizeName(column.column_name), localized: [] };
        column.description = { default: this.normalizeName(column.column_name), localized: [] };

        const dbType = column.column_type;
        column.column_type = this.normalizeClickHouseType(dbType) || this.normalizeType(dbType) || 'text';

        const floatOrInt = this.floatOrInt(this.stripNullable(dbType));
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
        column.tableCount = tableCount || 0;

        return column;
    }

    /** Strip Nullable/LowCardinality wrappers to get the inner type */
    private stripNullable(type: string): string {
        let inner = type;
        const nullableMatch = inner.match(/^Nullable\((.+)\)$/);
        if (nullableMatch) inner = nullableMatch[1];
        const lcMatch = inner.match(/^LowCardinality\((.+)\)$/);
        if (lcMatch) inner = lcMatch[1];
        return inner;
    }

    private normalizeClickHouseType(type: string): string | null {
        const inner = this.stripNullable(type);
        const upperType = inner.replace(/ *\([^)]*\) */g, '').toUpperCase();

        if (['STRING', 'FIXEDSTRING', 'UUID', 'ENUM8', 'ENUM16', 'LOWCARDINALITY', 'IPV4', 'IPV6'].includes(upperType)) {
            return 'text';
        }
        if ([
            'INT8', 'INT16', 'INT32', 'INT64', 'INT128', 'INT256',
            'UINT8', 'UINT16', 'UINT32', 'UINT64', 'UINT128', 'UINT256',
            'FLOAT32', 'FLOAT64', 'DECIMAL', 'DECIMAL32', 'DECIMAL64', 'DECIMAL128',
            'BOOL'
        ].includes(upperType)) {
            return 'numeric';
        }
        if (['DATE', 'DATE32', 'DATETIME', 'DATETIME64'].includes(upperType)) {
            return 'date';
        }
        return null;
    }

    private normalizeName(name: string): string {
        return name.split('_').join(' ')
            .toLowerCase()
            .split(' ')
            .map(s => s.charAt(0).toUpperCase() + s.substring(1))
            .join(' ');
    }

    getForeignKeysQuery(): string {
        // ClickHouse does not support foreign keys
        return `SELECT '' AS foreign_table, '' AS primary_table, '' AS fk_column, '' AS pk_column WHERE 1 = 0`;
    }
}
