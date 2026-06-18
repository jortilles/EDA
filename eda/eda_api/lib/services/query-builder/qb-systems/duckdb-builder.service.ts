import { PgBuilderService } from './pg-builder.service';
import { EdaQueryParams } from '../query-builder.service';
import * as _ from 'lodash';

export class DuckDBBuilderService extends PgBuilderService {

    public analizedQuery(params: EdaQueryParams) {
        const { fields, tables, origin, dest, joinTree, filters, joinType, valueListJoins, schema } = params;

        const fromTable = tables.filter(table => table.name === origin)
            .map(table => table.query ? this['cleanViewString'](table.query) : table.name)[0];
        const vista = tables.filter(table => table.name === origin)
            .map(table => !!table.query)[0];

        const generateQuery = () => {
            let myQuery: string = '';

            if (vista) {
                myQuery += `FROM ${fromTable}`;
            } else {
                myQuery += `FROM "${schema}"."${fromTable}"`;
            }

            let joinString: any[];
            let alias: any;
            if (this.queryTODO.joined) {
                const responseJoins = this.setJoins(joinTree, joinType ?? 'inner', schema ?? 'main', valueListJoins ?? []);
                joinString = responseJoins.joinString;
                alias = responseJoins.aliasTables;
            } else {
                joinString = this.getJoins(joinTree, dest, tables, joinType, valueListJoins, schema);
            }

            joinString.forEach(x => { myQuery = myQuery + '\n' + x; });
            myQuery += this.getFilters(filters);

            if (alias) {
                for (const key in alias) {
                    myQuery = myQuery.split(key).join(`"${alias[key]}"`);
                }
            }

            return myQuery;
        };

        const countTablesInSQL = (query: string) => {
            const normalizedQuery = query.toUpperCase();
            const fromCount = (normalizedQuery.match(/\bFROM\b/g) || []).length;
            const joinCount = (normalizedQuery.match(/\bJOIN\b/g) || []).length;
            return fromCount + joinCount;
        };

        const querys: any = {};
        const fromQuery = generateQuery();

        querys['general'] = [
            `SELECT '${countTablesInSQL(fromQuery)}' AS "count_tables"`
        ];

        for (const col of fields) {
            const diplayName = col.display_name;
            const table_column = `"${col.table_id}"."${col.column_name}"`;
            const mainQuery = `(SELECT ${table_column} ${fromQuery}) AS main`;

            querys[diplayName] = [];

            querys[diplayName].push(`SELECT '${col.table_id}' AS source_table`);
            querys[diplayName].push(`SELECT COUNT( * ) AS "count_rows" FROM ${col.table_id}`);

            if (col.column_type === 'text' || col.column_type === 'html') {
                querys[diplayName].push(
                    `SELECT SUM(CASE WHEN "main"."${col.column_name}" IS NULL THEN 1 ELSE 0 END) AS "count_nulls" FROM ${mainQuery}`
                );
                querys[diplayName].push(
                    `SELECT SUM(CASE WHEN "main"."${col.column_name}" = '' THEN 1 ELSE 0 END) AS "count_empty" FROM ${mainQuery}`
                );
                querys[diplayName].push(
                    `SELECT COUNT(DISTINCT "main"."${col.column_name}") AS "count_distinct" FROM ${mainQuery}`
                );
                querys[diplayName].push(`
          SELECT STRING_AGG(label_count, ', ') AS most_duplicated
          FROM (
              SELECT
                  "main"."${col.column_name}" || ' (' || COUNT("main"."${col.column_name}") || ')' AS label_count
              FROM ${mainQuery}
              GROUP BY "main"."${col.column_name}"
              ORDER BY COUNT("main"."${col.column_name}") DESC
              LIMIT 5
          ) sub;
        `);
                querys[diplayName].push(`
          SELECT STRING_AGG(label_count, ', ') AS least_duplicated
          FROM (
              SELECT
                  "main"."${col.column_name}" || ' (' || COUNT("main"."${col.column_name}") || ')' AS label_count
              FROM ${mainQuery}
              GROUP BY "main"."${col.column_name}"
              ORDER BY COUNT("main"."${col.column_name}") ASC
              LIMIT 5
          ) sub;
        `);
            } else if (col.column_type === 'numeric') {
                querys[diplayName].push(
                    `SELECT SUM(CASE WHEN "main"."${col.column_name}" IS NULL THEN 1 ELSE 0 END) AS "count_nulls" FROM ${mainQuery}`
                );
                querys[diplayName].push(`SELECT MAX("main"."${col.column_name}") AS "max" FROM ${mainQuery}`);
                querys[diplayName].push(`SELECT MIN("main"."${col.column_name}") AS "min" FROM ${mainQuery}`);
                querys[diplayName].push(`
            WITH moda_counts AS (
                SELECT "main"."${col.column_name}" AS mode_value, COUNT(*) AS frequency
                FROM ${mainQuery}
                GROUP BY 1
                ORDER BY 2 DESC
                LIMIT 1
            )
            SELECT mode_value || ' (total: '|| frequency ||')' AS "mode"
            FROM  moda_counts;
        `);
                // DuckDB does not support trunc(x, n) — use round(x, n) instead
                querys[diplayName].push(`SELECT ROUND( AVG("main"."${col.column_name}"), 3) AS "avg" FROM ${mainQuery}`);
                querys[diplayName].push(
                    `SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "main"."${col.column_name}") AS "median" FROM ${mainQuery}`
                );
            } else if (col.column_type === 'date') {
                querys[diplayName].push(
                    `SELECT SUM(CASE WHEN "main"."${col.column_name}" IS NULL THEN 1 ELSE 0 END) AS "count_nulls" FROM ${mainQuery}`
                );
                querys[diplayName].push(
                    `SELECT strftime(MAX("main"."${col.column_name}"), '%Y-%m-%d') AS "max" FROM ${mainQuery}`
                );
                querys[diplayName].push(
                    `SELECT strftime(MIN("main"."${col.column_name}"), '%Y-%m-%d') AS "min" FROM ${mainQuery}`
                );
                const queryMonth = `
            WITH monthly_counts AS (
                SELECT strftime("main"."${col.column_name}", '%Y-%m') AS vmonth, COUNT(*) AS total
                FROM ${mainQuery}
                GROUP BY 1
            )
        `;
                querys[diplayName].push(
                    `${queryMonth} SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total) AS median_count_bymonth FROM monthly_counts;`
                );
                querys[diplayName].push(
                    `${queryMonth} SELECT (vmonth || ' (total: ' || total || ')') "max_bymonth" FROM monthly_counts ORDER BY total DESC LIMIT 1;`
                );
                querys[diplayName].push(
                    `${queryMonth} SELECT (vmonth || ' (total: ' || total || ')') "min_bymonth" FROM monthly_counts ORDER BY total ASC LIMIT 1;`
                );
            }
        }

        return querys;
    }

    // ── DuckDB-specific fixes ─────────────────────────────────────────────────

    // pg-builder uses to_date()/to_timestamp() with PostgreSQL format codes.
    // DuckDB supports these but the double-space in 'YYYY-MM-DD  HH24:MI:SS'
    // causes parse errors. Use ISO casting instead.

    public processFilter(filter: any, columnType: string): string {
        if (columnType !== 'date') return super.processFilter(filter, columnType);
        const values = (Array.isArray(filter) ? filter : [filter])
            .map(v => (v === null || v === undefined) ? 'ihatenulos' : v);
        if (values.some(v => v === '(x => None)')) return `'4092-01-01'::TIMESTAMP`;
        return values
            .map(v => v === 'ihatenulos' ? `'4092-01-01'::TIMESTAMP` : `'${v}'::TIMESTAMP`)
            .join(',');
    }

    public processFilterEndRange(filter: any, columnType: string): string {
        if (columnType !== 'date') return super.processFilterEndRange(filter, columnType);
        const values = (Array.isArray(filter) ? filter : [filter])
            .map(v => (v === null || v === undefined) ? 'ihatenulos' : v);
        return values
            .map(v => v === 'ihatenulos' ? `'4092-01-01 23:59:59'::TIMESTAMP` : `'${v} 23:59:59'::TIMESTAMP`)
            .join(',');
    }

    // PgBuilderService generates ROUND(agg(col)::numeric, n)::float.
    // DuckDB requires the cast INSIDE the aggregation: ROUND(agg(col::numeric), n)::float.

    public getSeparedColumns(origin: string, dest: string[]) {
        const [columns, grouping] = super.getSeparedColumns(origin, dest) as [string[], string[]];
        const fixedColumns = columns
            .map(c => c.replace(/\b(sum|avg|min|max)\(([^)]+)\)::numeric/g, (_, agg, col) => `${agg}(${col}::numeric)`))
            .map(c => this.replaceToCharWithStrftime(c));
        const fixedGrouping = grouping.map(g => this.replaceToCharWithStrftime(g));
        return [fixedColumns, fixedGrouping];
    }

    private replaceToCharWithStrftime(sql: string): string {
        return sql
            .replace(/to_char\(\s*(.+?)\s*,\s*'YYYY-"Q"Q'\s*\)/g,  `(strftime($1, '%Y-Q') || datepart('quarter', $1))`)
            .replace(/to_char\(\s*(.+?)\s*,\s*'YYYY-MM-DD HH:MI:SS'\s*\)/g, `strftime($1, '%Y-%m-%d %H:%M:%S')`)
            .replace(/to_char\(\s*(.+?)\s*,\s*'YYYY-MM-DD HH:MI'\s*\)/g,    `strftime($1, '%Y-%m-%d %H:%M')`)
            .replace(/to_char\(\s*(.+?)\s*,\s*'YYYY-MM-DD HH'\s*\)/g,       `strftime($1, '%Y-%m-%d %H')`)
            .replace(/to_char\(\s*(.+?)\s*,\s*'YYYY-MM-DD'\s*\)/g,          `strftime($1, '%Y-%m-%d')`)
            .replace(/to_char\(\s*(.+?)\s*,\s*'IYYY-IW'\s*\)/g,             `strftime($1, '%G-%V')`)
            .replace(/to_char\(\s*(.+?)\s*,\s*'YYYY-MM'\s*\)/g,             `strftime($1, '%Y-%m')`)
            .replace(/to_char\(\s*(.+?)\s*,\s*'YYYY'\s*\)/g,                `strftime($1, '%Y')`);
    }

}
