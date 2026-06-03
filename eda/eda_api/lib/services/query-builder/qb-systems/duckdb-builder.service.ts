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
                    `SELECT TO_CHAR(MAX("main"."${col.column_name}"), 'YYYY-MM-DD') AS "max" FROM ${mainQuery}`
                );
                querys[diplayName].push(
                    `SELECT TO_CHAR(MIN("main"."${col.column_name}"), 'YYYY-MM-DD') AS "min" FROM ${mainQuery}`
                );
                const queryMonth = `
            WITH monthly_counts AS (
                SELECT TO_CHAR("main"."${col.column_name}", 'YYYY-MM') AS vmonth, COUNT(*) AS total
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

    // read_csv_auto infers types independently per file, so join columns can end up
    // as different types (e.g. INT64 vs VARCHAR). Wrapping both ON sides in
    // CAST(... AS VARCHAR) makes every join type-safe without changing the schema.

    public getJoins(joinTree: any[], dest: any[], tables: any[], joinType: string, valueListJoins: any[], schema: string): string[] {
        return this.castJoinConditions(super.getJoins(joinTree, dest, tables, joinType, valueListJoins, schema));
    }

    public setJoins(joinTree: any[], joinType: string, schema: string, valueListJoins: string[]): any {
        const result = super.setJoins(joinTree, joinType, schema, valueListJoins);
        result.joinString = this.castJoinConditions(result.joinString);
        return result;
    }

    // PgBuilderService generates ROUND(agg(col)::numeric, n)::float.
    // DuckDB requires the cast INSIDE the aggregation: ROUND(agg(col::numeric), n)::float.

    public getSeparedColumns(origin: string, dest: string[]) {
        const [columns, grouping] = super.getSeparedColumns(origin, dest) as [string[], string[]];
        const fixed = columns.map(c =>
            c.replace(
                /\b(sum|avg|min|max)\(([^)]+)\)::numeric/g,
                (_, agg, col) => `${agg}(${col}::numeric)`
            )
        );
        return [fixed, grouping];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private castJoinConditions(joins: string[]): string[] {
        return joins.map(j => this.castOnCondition(j));
    }

    private castOnCondition(joinStr: string): string {
        const onMatch = /\bon\b/i.exec(joinStr);
        if (!onMatch) return joinStr;

        const beforeOn = joinStr.substring(0, onMatch.index);
        const afterOn  = joinStr.substring(onMatch.index + onMatch[0].length);

        const andParts = afterOn.split(/\band\b/i);
        const wrapped = andParts.map(part => {
            const eqIdx = part.indexOf('=');
            if (eqIdx === -1) return part;
            const left  = part.substring(0, eqIdx).trim();
            const right = part.substring(eqIdx + 1).trim();
            return `CAST(${left} AS VARCHAR) = CAST(${right} AS VARCHAR)`;
        });

        return `${beforeOn}ON ${wrapped.join(' AND ')}`;
    }
}
