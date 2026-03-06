import { EdaQueryParams, QueryBuilderService } from './../query-builder.service';
import * as _ from 'lodash';


export class ClickHouseBuilderService extends QueryBuilderService {

  public analizedQuery(params: EdaQueryParams) {
    const { fields, tables, origin, dest, joinTree, filters, joinType, valueListJoins, schema } = params;
    const database = schema || 'default';

    const fromTable = tables.filter(t => t.name === origin).map(t => t.query ? this.cleanViewString(t.query) : t.name)[0];
    const vista = tables.filter(t => t.name === origin).map(t => t.query ? true : false)[0];

    const generateQuery = () => {
      let myQuery = vista
        ? `FROM ${fromTable}`
        : `FROM \`${database}\`.\`${fromTable}\``;

      let joinString: any[];
      let alias: any;
      if (this.queryTODO.joined) {
        const responseJoins = this.setJoins(joinTree, joinType, database, valueListJoins);
        joinString = responseJoins.joinString;
        alias = responseJoins.aliasTables;
      } else {
        joinString = this.getJoins(joinTree, dest, tables, joinType, valueListJoins, database);
      }

      joinString.forEach(x => { myQuery = myQuery + '\n' + x; });
      myQuery += this.getFilters(filters);

      if (alias) {
        for (const key in alias) {
          myQuery = myQuery.split(key).join(`\`${alias[key]}\``);
        }
      }
      return myQuery;
    };

    const countTablesInSQL = (query: string) => {
      const upper = query.toUpperCase();
      return (upper.match(/\bFROM\b/g) || []).length + (upper.match(/\bJOIN\b/g) || []).length;
    };

    const querys: any = {};
    const fromQuery = generateQuery();

    querys['general'] = [`SELECT '${countTablesInSQL(fromQuery)}' AS "count_tables"`];

    for (const col of fields) {
      const displayName = col.display_name;
      const table_column = `\`${col.table_id}\`.\`${col.column_name}\``;
      const mainQuery = `(SELECT ${table_column} ${fromQuery}) AS main`;

      querys[displayName] = [];

      // Source Table
      querys[displayName].push(`SELECT '${col.table_id}' AS source_table`);
      // COUNT
      querys[displayName].push(`SELECT COUNT(*) AS "count_rows" FROM \`${col.table_id}\``);

      if (col.column_type === 'text' || col.column_type === 'html') {
        // COUNT NULLS
        querys[displayName].push(`SELECT SUM(if(isNull(main.\`${col.column_name}\`), 1, 0)) AS "count_nulls" FROM ${mainQuery}`);
        // COUNT EMPTY
        querys[displayName].push(`SELECT SUM(if(main.\`${col.column_name}\` = '', 1, 0)) AS "count_empty" FROM ${mainQuery}`);
        // COUNT DISTINCT
        querys[displayName].push(`SELECT COUNT(DISTINCT main.\`${col.column_name}\`) AS "count_distinct" FROM ${mainQuery}`);
        // MostDuplicated
        querys[displayName].push(`
          SELECT arrayStringConcat(groupArray(label_count), ', ') AS most_duplicated
          FROM (
            SELECT concat(toString(main.\`${col.column_name}\`), ' (', toString(COUNT(main.\`${col.column_name}\`)), ')') AS label_count
            FROM ${mainQuery}
            GROUP BY main.\`${col.column_name}\`
            ORDER BY COUNT(main.\`${col.column_name}\`) DESC
            LIMIT 5
          ) sub
        `);
        // LeastDuplicated
        querys[displayName].push(`
          SELECT arrayStringConcat(groupArray(label_count), ', ') AS least_duplicated
          FROM (
            SELECT concat(toString(main.\`${col.column_name}\`), ' (', toString(COUNT(main.\`${col.column_name}\`)), ')') AS label_count
            FROM ${mainQuery}
            GROUP BY main.\`${col.column_name}\`
            ORDER BY COUNT(main.\`${col.column_name}\`) ASC
            LIMIT 5
          ) sub
        `);
      } else if (col.column_type === 'numeric') {
        // COUNT NULLS
        querys[displayName].push(`SELECT SUM(if(isNull(main.\`${col.column_name}\`), 1, 0)) AS "count_nulls" FROM ${mainQuery}`);
        // MAX
        querys[displayName].push(`SELECT MAX(main.\`${col.column_name}\`) AS "max" FROM ${mainQuery}`);
        // MIN
        querys[displayName].push(`SELECT MIN(main.\`${col.column_name}\`) AS "min" FROM ${mainQuery}`);
        // MODE
        querys[displayName].push(`
          WITH moda_counts AS (
            SELECT main.\`${col.column_name}\` AS mode_value, COUNT(*) AS frequency
            FROM ${mainQuery}
            GROUP BY main.\`${col.column_name}\`
            ORDER BY frequency DESC
            LIMIT 1
          )
          SELECT concat(toString(mode_value), ' (total: ', toString(frequency), ')') AS "mode"
          FROM moda_counts
        `);
        // AVG
        querys[displayName].push(`SELECT round(AVG(main.\`${col.column_name}\`), 3) AS "avg" FROM ${mainQuery}`);
        // MEDIAN
        querys[displayName].push(`SELECT quantile(0.5)(main.\`${col.column_name}\`) AS "median" FROM ${mainQuery}`);

      } else if (col.column_type === 'date') {
        // COUNT NULLS
        querys[displayName].push(`SELECT SUM(if(isNull(main.\`${col.column_name}\`), 1, 0)) AS "count_nulls" FROM ${mainQuery}`);
        // MAX
        querys[displayName].push(`SELECT formatDateTime(MAX(main.\`${col.column_name}\`), '%Y-%m-%d') AS "max" FROM ${mainQuery}`);
        // MIN
        querys[displayName].push(`SELECT formatDateTime(MIN(main.\`${col.column_name}\`), '%Y-%m-%d') AS "min" FROM ${mainQuery}`);

        const queryMonth = `
          WITH monthly_counts AS (
            SELECT formatDateTime(main.\`${col.column_name}\`, '%Y-%m') AS vmonth, COUNT(*) AS total
            FROM ${mainQuery}
            GROUP BY vmonth
          )
        `;
        // MEDIAN count by month
        querys[displayName].push(`${queryMonth} SELECT quantile(0.5)(total) AS median_count_bymonth FROM monthly_counts`);
        // MAX by month
        querys[displayName].push(`${queryMonth} SELECT concat(vmonth, ' (total: ', toString(total), ')') AS "max_bymonth" FROM monthly_counts ORDER BY total DESC LIMIT 1`);
        // MIN by month
        querys[displayName].push(`${queryMonth} SELECT concat(vmonth, ' (total: ', toString(total), ')') AS "min_bymonth" FROM monthly_counts ORDER BY total ASC LIMIT 1`);
      }
    }

    return querys;
  }

  public normalQuery(
    columns: string[], origin: string, dest: any[], joinTree: any[], grouping: any[],
    filters: any[], havingFilters: any[], tables: Array<any>, limit: number,
    joinType: string, groupByEnabled: boolean, valueListJoins: Array<any>,
    schema: string, database: string, forSelector: any
  ) {
    if (!schema || schema === 'null' || schema === '') {
      schema = database || 'default';
    }

    let o = tables.filter(t => t.name === origin).map(t => t.query ? this.cleanViewString(t.query) : t.name)[0];
    let vista = tables.filter(t => t.name === origin).map(t => t.query ? true : false)[0];

    let myQuery: string;
    if (forSelector === true) {
      myQuery = vista
        ? `SELECT DISTINCT ${columns.join(', ')} \nFROM ${o}`
        : `SELECT DISTINCT ${columns.join(', ')} \nFROM \`${schema}\`.\`${o}\``;
    } else {
      myQuery = vista
        ? `SELECT ${columns.join(', ')} \nFROM ${o}`
        : `SELECT ${columns.join(', ')} \nFROM \`${schema}\`.\`${o}\``;
    }

    // JOINS
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

    // WHERE
    myQuery += this.getFilters(filters);

    // GROUP BY
    if (grouping.length > 0 && groupByEnabled) {
      myQuery += '\nGROUP BY ' + grouping.join(', ');
    }

    // HAVING
    myQuery += this.getHavingFilters(havingFilters);

    // ORDER BY
    const orderColumns = this.queryTODO.fields.map(col => {
      if (col.ordenation_type !== 'No' && col.ordenation_type !== undefined) {
        return `\`${col.display_name}\` ${col.ordenation_type}`;
      }
      return false;
    }).filter(e => e !== false);

    if (orderColumns.length > 0) {
      myQuery += `\nORDER BY ${orderColumns.join(',')}`;
    }
    if (limit) myQuery += `\nLIMIT ${limit}`;

    if (alias) {
      for (const key in alias) {
        myQuery = myQuery.split(key).join(`\`${alias[key]}\``);
      }
    }

    return myQuery;
  }

  public getFilters(filters) {
    if (this.permissions.length > 0) {
      this.permissions.forEach(permission => { filters.push(permission); });
    }
    if (filters.length) {
      let equalfilters = this.getEqualFilters(filters);
      filters = filters.filter(f => !equalfilters.toRemove.includes(f.filter_id));
      let filtersString = `\nWHERE 1 = 1 `;

      filters.forEach(f => {
        const column = this.findColumn(f.filter_table, f.filter_column);
        const colname = this.getFilterColname(column);
        if (f.filter_type === 'not_null') {
          filtersString += '\nAND ' + this.filterToString(f);
        } else {
          const nullValueIndex = f.filter_elements[0].value1.indexOf(null);
          if (nullValueIndex !== -1) {
            if (f.filter_elements[0].value1.length === 1) {
              filtersString += f.filter_type === '='
                ? `\nAND isNull(${colname}) `
                : `\nAND isNotNull(${colname}) `;
            } else {
              filtersString += f.filter_type === '='
                ? `\nAND (${this.filterToString(f)} OR isNull(${colname})) `
                : `\nAND (${this.filterToString(f)} OR isNotNull(${colname})) `;
            }
          } else {
            filtersString += '\nAND ' + this.filterToString(f);
          }
        }
      });

      filtersString = this.mergeFilterStrings(filtersString, equalfilters);
      return filtersString;
    } else {
      return '';
    }
  }

  public getJoins(joinTree: any[], dest: any[], tables: Array<any>, joinType: string, valueListJoins: Array<any>, schema: string) {
    if (!schema || schema === 'null' || schema === '') {
      schema = 'default';
    }

    const joins = [];
    const joined = [];
    const joinString = [];
    let myJoin = joinType;

    for (let i = 0; i < dest.length; i++) {
      const elem = joinTree.find(n => n.name === dest[i]);
      const tmp = [];
      elem.path.forEach(parent => { tmp.push(parent); });
      tmp.push(elem.name);
      joins.push(tmp);
    }

    joins.forEach(e => {
      for (let i = 0; i < e.length - 1; i++) {
        const j = i + 1;
        if (!joined.includes(e[j])) {
          const joinColumns = this.findJoinColumns(e[j], e[i]);
          const t = tables.filter(table => table.name === e[j]).map(table => table.query ? this.cleanViewString(table.query) : table.name)[0];
          const view = tables.filter(table => table.name === e[j]).map(table => table.query ? true : false)[0];

          myJoin = valueListJoins.includes(e[j]) ? 'LEFT' : joinType;

          if (typeof joinColumns[0] === 'string') {
            if (!view) {
              if (joinColumns[2] && joinColumns[2] === 'source') {
                joinString.push(` ${myJoin} JOIN \`${schema}\`.\`${t}\` ON ${joinColumns[1]} = \`${schema}\`.\`${e[i]}\`.\`${joinColumns[0]}\``);
              } else if (joinColumns[2] && joinColumns[2] === 'target') {
                joinString.push(` ${myJoin} JOIN \`${schema}\`.\`${t}\` ON \`${schema}\`.\`${e[j]}\`.\`${joinColumns[1]}\` = ${joinColumns[0]} `);
              } else {
                joinString.push(` ${myJoin} JOIN \`${schema}\`.\`${t}\` ON \`${schema}\`.\`${e[j]}\`.\`${joinColumns[1]}\` = \`${schema}\`.\`${e[i]}\`.\`${joinColumns[0]}\``);
              }
            } else {
              joinString.push(` ${myJoin} JOIN ${t} ON \`${e[j]}\`.\`${joinColumns[1]}\` = \`${schema}\`.\`${e[i]}\`.\`${joinColumns[0]}\``);
            }
          } else {
            if (!view) {
              let join = ` ${myJoin} JOIN \`${schema}\`.\`${t}\` ON`;
              joinColumns[0].forEach((_, x) => {
                if (joinColumns[2] && joinColumns[2] === 'source') {
                  join += ` ${joinColumns[1][x]} = \`${schema}\`.\`${e[i]}\`.\`${joinColumns[0][x]}\` AND`;
                } else if (joinColumns[2] && joinColumns[2] === 'target') {
                  join += ` \`${schema}\`.\`${e[j]}\`.\`${joinColumns[1][x]}\` = ${joinColumns[0][x]} AND`;
                } else {
                  join += ` \`${schema}\`.\`${e[j]}\`.\`${joinColumns[1][x]}\` = \`${schema}\`.\`${e[i]}\`.\`${joinColumns[0][x]}\` AND`;
                }
              });
              join = join.slice(0, join.length - ' AND'.length);
              joinString.push(join);
            } else {
              let join = ` ${myJoin} JOIN ${t} ON`;
              joinColumns[0].forEach((_, x) => {
                join += ` \`${e[j]}\`.\`${joinColumns[1][x]}\` = \`${schema}\`.\`${e[i]}\`.\`${joinColumns[0][x]}\` AND`;
              });
              join = join.slice(0, join.length - ' AND'.length);
              joinString.push(join);
            }
          }
          joined.push(e[j]);
        }
      }
    });

    return joinString;
  }

  public setJoins(joinTree: any[], joinType: string, schema: string, valueListJoins: string[]) {
    if (!schema || schema === 'null') {
      schema = 'default';
    }

    const joinExists = new Set();
    const aliasTables = {};
    const joinString = [];
    const targetTableJoin = [];

    for (const join of joinTree) {
      const sourceLastDotInx = join[0].lastIndexOf('.');
      const sourceTable = join[0].substring(0, sourceLastDotInx);
      const sourceColumn = join[0].substring(sourceLastDotInx + 1);
      const [targetTable, targetColumn] = join[1].split('.');

      let sourceJoin = `\`${sourceTable}\`.\`${sourceColumn}\``;
      let targetJoin = `\`${targetTable}\`.\`${targetColumn}\``;

      if (!joinExists.has(`${sourceJoin}=${targetJoin}`)) {
        joinExists.add(`${sourceJoin}=${targetJoin}`);

        let aliasSource: string;
        if (sourceJoin.split('.')[0] === targetJoin.split('.')[0]) {
          aliasSource = `\`${sourceTable}.${sourceColumn}\``;
        }

        let alias = `\`${targetTable}.${targetColumn}.${sourceColumn}\``;
        if (aliasSource) alias = aliasSource;

        aliasTables[alias] = targetTable;

        let aliasTargetTable: string;
        if (targetTableJoin.includes(targetTable) || targetTable === sourceTable) {
          aliasTargetTable = `${targetTable}${sourceColumn}`;
          aliasTables[alias] = aliasTargetTable;
        }

        joinType = valueListJoins.includes(targetTable) ? 'LEFT' : joinType;

        let joinStr: string;
        if (aliasTargetTable) {
          targetJoin = `\`${aliasTargetTable}\`.\`${targetColumn}\``;
          joinStr = `${joinType} JOIN \`${targetTable}\` AS \`${aliasTargetTable}\` ON ${sourceJoin} = ${targetJoin}`;
        } else {
          joinStr = `${joinType} JOIN \`${targetTable}\` ON ${sourceJoin} = ${targetJoin}`;
        }

        if (!joinString.includes(joinStr)) {
          targetTableJoin.push(aliasTargetTable || targetTable);
          joinString.push(joinStr);
        }
      }
    }

    return { joinString, aliasTables };
  }

  private getDateFormat(SQLexpression: string, format: string): string {
    switch (format) {
      case 'year':            return `toString(toYear(${SQLexpression}))`;
      case 'quarter':         return `concat(toString(toYear(${SQLexpression})), '-Q', toString(toQuarter(${SQLexpression})))`;
      case 'month':           return `formatDateTime(${SQLexpression}, '%Y-%m')`;
      case 'week':            return `formatDateTime(toMonday(${SQLexpression}), '%Y-%V')`;
      case 'day':             return `formatDateTime(${SQLexpression}, '%Y-%m-%d')`;
      case 'week_day':        return `toDayOfWeek(${SQLexpression})`;
      case 'day_hour':        return `formatDateTime(${SQLexpression}, '%Y-%m-%d %H')`;
      case 'day_hour_minute': return `formatDateTime(${SQLexpression}, '%Y-%m-%d %H:%M')`;
      case 'timestamp':       return `formatDateTime(${SQLexpression}, '%Y-%m-%d %H:%M:%S')`;
      default:                return `formatDateTime(${SQLexpression}, '%Y-%m-%d')`;
    }
  }

  public getSeparedColumns(origin: string, dest: string[]) {
    const columns = [];
    const grouping = [];

    this.queryTODO.fields.forEach(el => {
      el.order !== 0 && el.table_id !== origin && !dest.includes(el.table_id) ? dest.push(el.table_id) : false;

      let table_column: string;
      if (el.autorelation && !el.valueListSource && !this.queryTODO.forSelector) {
        table_column = `\`${el.joins[el.joins.length - 1][0]}\`.\`${el.column_name}\``;
      } else {
        table_column = `\`${el.table_id}\`.\`${el.column_name}\``;
      }

      let whatIfExpression = '';
      if (el.whatif_column) whatIfExpression = `${el.whatif.operator} ${el.whatif.value}`;

      el.minimumFractionDigits = el.minimumFractionDigits || 0;

      if (el.computed_column === 'computed') {
        if (el.column_type === 'text' || el.column_type === 'html') {
          if (el.aggregation_type === 'none') {
            columns.push(` ${el.SQLexpression} AS \`${el.display_name}\``);
          } else if (el.aggregation_type === 'count_distinct') {
            columns.push(` count(distinct ${el.SQLexpression}) AS \`${el.display_name}\``);
          } else {
            columns.push(` ${el.aggregation_type}(${el.SQLexpression}) AS \`${el.display_name}\``);
          }
        } else if (el.column_type === 'numeric') {
          if (el.aggregation_type === 'none') {
            columns.push(` toFloat64(${el.SQLexpression} ${whatIfExpression}) AS \`${el.display_name}\``);
          } else if (el.aggregation_type === 'count_distinct') {
            columns.push(` toFloat64(count(distinct(${el.SQLexpression} ${whatIfExpression}))) AS \`${el.display_name}\``);
          } else {
            columns.push(` toFloat64(${el.aggregation_type}(${el.SQLexpression} ${whatIfExpression})) AS \`${el.display_name}\``);
          }
        } else if (el.column_type === 'date') {
          if (el.aggregation_type === 'none') {
            columns.push(` ${this.getDateFormat(el.SQLexpression, el.format)} AS \`${el.display_name}\``);
          } else if (el.aggregation_type === 'count_distinct') {
            columns.push(` count(distinct ${this.getDateFormat(el.SQLexpression, el.format)}) AS \`${el.display_name}\``);
          } else {
            columns.push(` ${el.aggregation_type}(${this.getDateFormat(el.SQLexpression, el.format)}) AS \`${el.display_name}\``);
          }
        } else if (el.column_type === 'coordinate') {
          if (el.aggregation_type === 'none') {
            columns.push(` ${el.SQLexpression} AS \`${el.display_name}\``);
          } else if (el.aggregation_type === 'count_distinct') {
            columns.push(` count(distinct ${el.SQLexpression}) AS \`${el.display_name}\``);
          } else {
            columns.push(` ${el.aggregation_type}(${el.SQLexpression}) AS \`${el.display_name}\``);
          }
        }
        // GROUP BY for computed columns
        if (el.column_type === 'date') {
          grouping.push(this.getDateFormat(el.SQLexpression, el.format));
        } else {
          if (el.aggregation_type === 'none') {
            grouping.push(` (${el.SQLexpression}) `);
          }
        }
      } else {
        if (el.aggregation_type !== 'none') {
          if (el.aggregation_type === 'count_distinct') {
            columns.push(`toFloat64(round(toFloat64(count(distinct ${table_column})) ${whatIfExpression}, ${el.minimumFractionDigits})) AS \`${el.display_name}\``);
          } else {
            columns.push(`toFloat64(round(${el.aggregation_type}(${table_column}) ${whatIfExpression}, ${el.minimumFractionDigits})) AS \`${el.display_name}\``);
          }
        } else {
          if (el.column_type === 'numeric') {
            columns.push(`toFloat64(round(toFloat64(${table_column}), ${el.minimumFractionDigits})) ${whatIfExpression} AS \`${el.display_name}\``);
          } else if (el.column_type === 'date') {
            columns.push(this.getDateFormat(table_column, el.format) + ` AS \`${el.display_name}\``);
          } else {
            columns.push(`${table_column} AS \`${el.display_name}\``);
          }
          // GROUP BY
          if (el.column_type === 'date') {
            grouping.push(this.getDateFormat(table_column, el.format));
          } else {
            if (
              this.queryTODO.fields.length > 1 ||
              el.column_type !== 'numeric' ||
              (el.column_type === 'numeric' && el.aggregation_type === 'none')
            ) {
              grouping.push(`${table_column}`);
            }
          }
        }
      }
    });

    return [columns, grouping];
  }

  public filterToString(filterObject: any) {
    const column = this.findColumn(filterObject.filter_table, filterObject.filter_column);
    if (!column.hasOwnProperty('minimumFractionDigits')) {
      column.minimumFractionDigits = 0;
    }
    const colname = this.getFilterColname(column);
    const colType = column.column_type;

    switch (this.setFilterType(filterObject.filter_type)) {
      case 0:
        if (filterObject.filter_type === '!=') filterObject.filter_type = '<>';
        if (filterObject.filter_type === 'like') {
          return `${colname} ILIKE '%${filterObject.filter_elements[0].value1}%' `;
        }
        if (filterObject.filter_type === 'not_like') {
          return `${colname} NOT ILIKE '%${filterObject.filter_elements[0].value1}%' `;
        }
        return `${colname} ${filterObject.filter_type} ${this.processFilter(filterObject.filter_elements[0].value1, colType)} `;
      case 1:
        if (filterObject.filter_type === 'not_in') filterObject.filter_type = 'NOT IN';
        return `${colname} ${filterObject.filter_type} (${this.processFilter(filterObject.filter_elements[0].value1, colType)}) `;
      case 2:
        return `${colname} ${filterObject.filter_type}
                ${this.processFilter(filterObject.filter_elements[0].value1, colType)} AND ${this.processFilterEndRange(filterObject.filter_elements[1].value2, colType)}`;
      case 3:
        return `isNotNull(${colname})`;
    }
  }

  public getFilterColname(column: any): string {
    if (column.computed_column === 'no' || !column.hasOwnProperty('computed_column')) {
      return `\`${column.table_id}\`.\`${column.column_name}\``;
    } else {
      if (column.column_type === 'numeric') {
        return `round(toFloat64(${column.SQLexpression}), ${column.minimumFractionDigits})`;
      } else {
        return ` ${column.SQLexpression} `;
      }
    }
  }

  public getHavingFilters(filters) {
    if (filters.length) {
      let filtersString = `\nHAVING 1=1 `;
      filters.forEach(f => {
        const column = this.findHavingColumn(f.filter_table, f.filter_column);
        const colname = this.getHavingColname(column);
        if (f.filter_type === 'not_null') {
          filtersString += `\nAND isNotNull(${colname}) `;
        } else {
          const nullValueIndex = f.filter_elements[0].value1.indexOf(null);
          if (nullValueIndex !== -1) {
            if (f.filter_elements[0].value1.length === 1) {
              filtersString += f.filter_type === '='
                ? `\nAND isNull(${colname}) `
                : `\nAND isNotNull(${colname}) `;
            } else {
              filtersString += f.filter_type === '='
                ? `\nAND (${this.havingToString(f)} OR isNull(${colname})) `
                : `\nAND (${this.havingToString(f)} OR isNotNull(${colname})) `;
            }
          } else {
            filtersString += '\nAND ' + this.havingToString(f);
          }
        }
      });
      return filtersString;
    } else {
      return '';
    }
  }

  public getHavingColname(column: any): string {
    if (column.computed_column === 'no' || !column.hasOwnProperty('computed_column')) {
      return `toFloat64(round(${column.aggregation_type}(\`${column.table_id}\`.\`${column.column_name}\`), ${column.minimumFractionDigits}))`;
    } else {
      if (column.column_type === 'numeric') {
        return `round(toFloat64(${column.SQLexpression}), ${column.minimumFractionDigits})`;
      } else {
        return ` ${column.SQLexpression} `;
      }
    }
  }

  public havingToString(filterObject: any) {
    const column = this.findHavingColumn(filterObject.filter_table, filterObject.filter_column);
    if (!column.hasOwnProperty('minimumFractionDigits')) {
      column.minimumFractionDigits = 0;
    }
    const colname = this.getHavingColname(column);
    const colType = column.column_type;

    switch (this.setFilterType(filterObject.filter_type)) {
      case 0:
        if (filterObject.filter_type === '!=') filterObject.filter_type = '<>';
        if (filterObject.filter_type === 'like') {
          return `${colname} ILIKE '%${filterObject.filter_elements[0].value1}%' `;
        }
        if (filterObject.filter_type === 'not_like') {
          return `${colname} NOT ILIKE '%${filterObject.filter_elements[0].value1}%' `;
        }
        return `${colname} ${filterObject.filter_type} ${this.processFilter(filterObject.filter_elements[0].value1, colType)} `;
      case 1:
        if (filterObject.filter_type === 'not_in') filterObject.filter_type = 'NOT IN';
        return `${colname} ${filterObject.filter_type} (${this.processFilter(filterObject.filter_elements[0].value1, colType)}) `;
      case 2:
        return `${colname} ${filterObject.filter_type}
                ${this.processFilter(filterObject.filter_elements[0].value1, colType)} AND ${this.processFilterEndRange(filterObject.filter_elements[1].value2, colType)}`;
      case 3:
        return `isNotNull(${colname})`;
    }
  }

  public processFilter(filter: any, columnType: string) {
    filter = filter.map(elem => (elem === null || elem === undefined) ? 'ihatenulos' : elem);

    if (!Array.isArray(filter)) {
      switch (columnType) {
        case 'text':    return `'${filter}'`;
        case 'html':    return `'${filter}'`;
        case 'numeric': return filter;
        case 'date':    return `toDate('${filter}')`;
      }
    } else {
      let str = '';
      filter.forEach(value => {
        const tail = columnType === 'date'
          ? `toDate('${value}')`
          : columnType === 'numeric' ? value : `'${String(value).replace(/'/g, "''")}'`;
        str = str + tail + ',';
      });

      filter.forEach(f => {
        if (f === '(x => None)') {
          switch (columnType) {
            case 'text':    str = `'(x => None)'`; break;
            case 'html':    str = `'(x => None)'`; break;
            case 'numeric': str = 'null';          break;
            case 'date':    str = `toDate('4092-01-01')`; break;
          }
        }
      });

      return str.substring(0, str.length - 1);
    }
  }

  public processFilterEndRange(filter: any, columnType: string) {
    filter = filter.map(elem => (elem === null || elem === undefined) ? 'ihatenulos' : elem);

    if (!Array.isArray(filter)) {
      switch (columnType) {
        case 'text':    return `'${filter}'`;
        case 'html':    return `'${filter}'`;
        case 'numeric': return filter;
        case 'date':    return `toDateTime('${filter} 23:59:59')`;
      }
    } else {
      let str = '';
      filter.forEach(value => {
        const tail = columnType === 'date'
          ? `toDateTime('${value} 23:59:59')`
          : columnType === 'numeric' ? value : `'${String(value).replace(/'/g, "''")}'`;
        str = str + tail + ',';
      });
      return str.substring(0, str.length - 1);
    }
  }

  buildPermissionJoin(origin: string, joinStrings: string[], permissions: any[], schema?: string) {
    const originRef = schema ? `\`${schema}\`.\`${origin}\`` : `\`${origin}\``;
    let joinString = `( SELECT ${originRef}.* FROM ${originRef} `;
    joinString += joinStrings.join(' ') + ' WHERE ';
    permissions.forEach(permission => {
      joinString += ` ${this.filterToString(permission)} AND `;
    });
    return `${joinString.slice(0, joinString.lastIndexOf(' AND '))} ) `;
  }

  sqlQuery(query: string, filters: any[], filterMarks: string[]): string {
    const colsInFilters = [];
    filters.forEach((filter, i) => {
      let col = filter.type === 'in'
        ? filter.string.slice(filter.string.indexOf('.') + 1, filter.string.indexOf(' in ')).replace(/`/g, '')
        : filter.string.slice(filter.string.indexOf('.') + 1, filter.string.indexOf('between')).replace(/`/g, '');
      colsInFilters.push({ col, index: i });
    });

    filterMarks.forEach((mark) => {
      let subs = mark.split('').slice(filterMarks[0].indexOf('{') + 1, mark.indexOf('}') - mark.indexOf('$')).join('');
      let col = subs.slice(subs.indexOf('.') + 1);
      let arr = [];

      if (!colsInFilters.map(f => f.col.toUpperCase().trim()).includes(col.toUpperCase().trim())) {
        arr.push(`toString(${subs}) LIKE '%'`);
      } else {
        const index = colsInFilters.filter(f => f.col.toUpperCase().trim() === col.toUpperCase().trim()).map(f => f.index)[0];
        arr = filters[index].string.split(' ');
        arr[0] = subs;
      }
      query = query.replace(mark, arr.join(' '));
    });

    return query;
  }

  parseSchema(tables: string[], schema: string) {
    const reg = new RegExp(/[`.\[\]]/, 'g');
    return tables.map(table => {
      table = table.replace(schema, '');
      table = table.replace(reg, '');
      return table;
    });
  }

  private cleanViewString(query: string) {
    const index = query.lastIndexOf('as');
    return query.slice(0, index) + `AS \`${query.slice(index + 3)}\` `;
  }
}
