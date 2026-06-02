import { PgBuilderService } from './pg-builder.service';
import { EdaQueryParams } from '../query-builder.service';
import * as _ from 'lodash';

/**
 * DuckDB query builder — extends PgBuilderService because DuckDB is highly
 * PostgreSQL-compatible.  The only override needed is analizedQuery, because
 * DuckDB's trunc() does NOT accept a precision argument (use round() instead).
 * Schema defaults to 'main' (DuckDB default) instead of PostgreSQL's 'public'.
 */
export class DuckDBBuilderService extends PgBuilderService {

    public analizedQuery(params: EdaQueryParams) {
        const { fields, columns, tables, origin, dest, joinTree, grouping, filters, havingFilters, joinType, valueListJoins, schema } = params;

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
                const responseJoins = this.setJoins(joinTree, joinType, schema, valueListJoins);
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
}
