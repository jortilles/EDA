import { QueryBuilderService } from './../query-builder.service';
import * as _ from 'lodash';


export class BigQueryBuilderService extends QueryBuilderService {


  public normalQuery(columns: string[], origin: string, dest: any[], joinTree: any[], grouping: any[], tables: Array<any>, limit: number, joinType:string, valueListJoins:Array<any> , schema: string) {

    let o = tables.filter(table => table.name === origin).map(table => { return table.query ? table.query : table.name })[0];
    let myQuery = '';

    /**If origin is a view => (select foo from etc.) */
    const reg = new RegExp(/\([^()]+\)/g, "g");
    if (o.match(reg)) {
      myQuery = `SELECT ${columns.join(', ')} \nFROM ${o}`;
    } else {
      myQuery = `SELECT ${columns.join(', ')} \nFROM ${schema}.${o}`;
    }


    //to WHERE CLAUSE
    const filters = this.queryTODO.filters.filter(f => {

      const column = this.findColumn(f.filter_table, f.filter_column);
      if(column){
        return column.computed_column != 'computed_numeric';
      }else{
        return false;
      }

    });

    //TO HAVING CLAUSE 
    const havingFilters = this.queryTODO.filters.filter(f => {

      const column = this.findColumn(f.filter_table, f.filter_column);
      if(column){
        return column.computed_column == "computed_numeric";
      }else{
        return false;
      }

    });

    // JOINS
    const joinString = this.getJoins(joinTree, dest, tables, joinType, valueListJoins, schema);

    joinString.forEach(x => {
      myQuery = myQuery + '\n' + x;
    });

    // WHERE
    myQuery += this.getFilters(filters, 'where');

    // GroupBy
    if (grouping.length > 0) {
      myQuery += '\ngroup by ' + grouping.join(', ');
    }

    //HAVING 
    myQuery += this.getHavingFilters(havingFilters, 'having');

    // OrderBy
    const orderColumns = this.queryTODO.fields.map(col => {
      let out;

      if (col.ordenation_type !== 'No' && col.ordenation_type !== undefined) {
        out = `\`${col.display_name}\` ${col.ordenation_type}`
      } else {
        out = false;
      }

      return out;
    }).filter(e => e !== false);

    const order_columns_string = orderColumns.join(',');
    if (order_columns_string.length > 0) {
      myQuery = `${myQuery}\norder by ${order_columns_string}`;
    }
    if (limit) myQuery += `\nlimit ${limit}`;
    return myQuery;
  }

  public getFilters(filters, type: string) {

    if (this.permissions.length > 0) {
      this.permissions.forEach(permission => { filters.push(permission); });
    }
    if (filters.length) {

      let equalfilters = this.getEqualFilters(filters);
      filters = filters.filter(f => !equalfilters.toRemove.includes(f.filter_id));
      let filtersString = `\n${type} 1 = 1 `;

      filters.forEach(f => {

        const column = this.findColumn(f.filter_table, f.filter_column);
        const colname = type == 'where' ? `\`${f.filter_table}\`.\`${f.filter_column}\`` : `ROUND(  CAST( ${column.SQLexpression}  as numeric)  , ${column.minimumFractionDigits})`;

        if (f.filter_type === 'not_null') {
          filtersString += '\nand ' + this.filterToString(f, type);
        } else {
          let nullValueIndex = f.filter_elements[0].value1.indexOf(null);
          if (nullValueIndex != - 1) {
            if (f.filter_elements[0].value1.length === 1) {
              /* puedo haber escogido un nulo en la igualdad */
              if (f.filter_type == '=') {
                filtersString += `\nand ${colname}  is null `;
              } else {
                filtersString += `\nand ${colname}  is not null `;
              }
            } else {
              if (f.filter_type == '=') {
                filtersString += `\nand (${this.filterToString(f, type)} or ${colname}  is null) `;
              } else {
                filtersString += `\nand (${this.filterToString(f, type)} or ${colname}  is not null) `;
              }
            }
          } else {
            filtersString += '\nand ' + this.filterToString(f, type);
          }
        }
      });

      /**Allow filter ranges */
      filtersString = this.mergeFilterStrings(filtersString, equalfilters, type);
      return filtersString;
    } else {
      return '';
    }
  }

  public getHavingFilters(filters, type: string) {

    if (filters.length) {

      let filtersString = `\n${type} 1 = 1 `;

      filters.forEach(f => {

        const column = this.findColumn(f.filter_table, f.filter_column);
        const colname = type == 'where' ? `\`${f.filter_table}\`.\`${f.filter_column}\`` : `ROUND(  CAST( ${column.SQLexpression}  as numeric)  , ${column.minimumFractionDigits})`;

        if (f.filter_type === 'not_null') {
          filtersString += '\nand ' + this.filterToString(f, type);
        } else {
          let nullValueIndex = f.filter_elements[0].value1.indexOf(null);
          if (nullValueIndex != - 1) {
            if (f.filter_elements[0].value1.length === 1) {
              /* puedo haber escogido un nulo en la igualdad */
              if (f.filter_type == '=') {
                filtersString += `\nand ${colname}  is null `;
              } else {
                filtersString += `\nand ${colname}  is not null `;
              }
            } else {
              if (f.filter_type == '=') {
                filtersString += `\nand (${this.filterToString(f, type)} or ${colname}  is null) `;
              } else {
                filtersString += `\nand (${this.filterToString(f, type)} or ${colname}  is not null) `;
              }
            }
          } else {
            filtersString += '\nand ' + this.filterToString(f, type);
          }
        }
      });
      return filtersString;
    } else {
      return '';
    }
  }

  public getJoins(joinTree: any[], dest: any[], tables: Array<any>, joinType:string, valueListJoins:Array<any>, schema: string) {

    let joins = [];
    let joined = [];
    let joinString = [];
    let myJoin = joinType;

    for (let i = 0; i < dest.length; i++) {
      let elem = joinTree.find(n => n.name === dest[i]);
      let tmp = [];
      elem.path.forEach(parent => {
        tmp.push(parent);
      });
      tmp.push(elem.name);
      joins.push(tmp);
    }

    joins.forEach(e => {
      for (let i = 0; i < e.length - 1; i++) {
        let j = i + 1;
        if (!joined.includes(e[j])) {

          let joinColumns = this.findJoinColumns(e[j], e[i]);

          /**T can be a table or a custom view, if custom view has a query  */
          let t = tables.filter(table => table.name === e[j]).map(table => { return table.query ? table.query : table.name })[0];
          if( valueListJoins.includes(e[j])   ){
            myJoin = 'left'; // Si es una tabla que ve del multivaluelist aleshores els joins son left per que la consulta tingui sentit.
          }else{
            myJoin = joinType; 
          }
          //Version compatibility string//array
          if (typeof joinColumns[0] === 'string') {

            joinString.push(` ${myJoin} join ${schema}.${t} on \`${e[j]}\`.\`${joinColumns[1]}\` = \`${e[i]}\`.\`${joinColumns[0]}\``);

          } else {

            let join = ` ${myJoin} join ${schema}.${t} on`;

            joinColumns[0].forEach((_, x) => {

              join += ` \`${e[j]}\`.\`${joinColumns[1][x]}\` = \`${e[i]}\`.\`${joinColumns[0][x]}\` and`;

            });

            join = join.slice(0, join.length - 'and'.length);
            joinString.push(join);

          }

          joined.push(e[j]);


        }
      }
    });

    return joinString;
  }

  public getSeparedColumns(origin: string, dest: string[]) {
    const columns = [];
    const grouping = [];

    this.queryTODO.fields.forEach(el => {
      el.order !== 0 && el.table_id !== origin && !dest.includes(el.table_id) ? dest.push(el.table_id) : false;

      el.display_name = el.display_name.replace(/ /g, "_");

      if (!el.hasOwnProperty('minimumFractionDigits')) {
        el.minimumFractionDigits = 0;
      }

      // chapuza de JJ para integrar expresiones. Esto hay que hacerlo mejor.
      if (el.computed_column === 'computed_numeric') {
        columns.push(` ROUND(  CAST( ${el.SQLexpression}  as numeric)  , ${el.minimumFractionDigits}) as \`${el.display_name}\``);
      } else {

        if (el.aggregation_type !== 'none') {
          if (el.aggregation_type === 'count_distinct') {
            columns.push(`ROUND( count( distinct \`${el.table_id}\`.\`${el.column_name}\`), ${el.minimumFractionDigits||0}) as \`${el.display_name}\``);
          } else {
            columns.push(`ROUND(${el.aggregation_type}(\`${el.table_id}\`.\`${el.column_name}\`), ${el.minimumFractionDigits||0}) as \`${el.display_name}\``);
          }


        } else {
          if (el.column_type === 'numeric') {
            columns.push(`ROUND(\`${el.table_id}\`.\`${el.column_name}\`, ${el.minimumFractionDigits}) as \`${el.display_name}\``);
          } else if (el.column_type === 'date') {
            if (el.format) {
              if (_.isEqual(el.format, 'year')) {
                columns.push(`FORMAT_DATETIME('%Y',\`${el.table_id}\`.\`${el.column_name}\`) as \`${el.display_name}\``);

              } else if (_.isEqual(el.format, 'quarter')) {
                columns.push(`FORMAT_DATETIME('%Y-%Q', \`${el.table_id}\`.\`${el.column_name}\`) as \`${el.display_name}\``);

              } else if (_.isEqual(el.format, 'month')) {
                columns.push(`FORMAT_DATETIME('%Y-%m', \`${el.table_id}\`.\`${el.column_name}\`) as \`${el.display_name}\``);

              } else if (_.isEqual(el.format, 'week')) {
                columns.push(`EXTRACT(WEEK FROM \`${el.table_id}\`.\`${el.column_name}\`) as \`${el.display_name}\``);

              } else if (_.isEqual(el.format, 'week_day')) {
                columns.push(`EXTRACT(DAYOFWEEK FROM \`${el.table_id}\`.\`${el.column_name}\`) as \`${el.display_name}\``);

              } else if (_.isEqual(el.format, 'day')) {
                columns.push(`FORMAT_DATETIME( '%Y-%m-%d',\`${el.table_id}\`.\`${el.column_name}\`) as \`${el.display_name}\``);

              }else if (_.isEqual(el.format, 'day_hour')) {
                columns.push(`FORMAT_DATETIME( '%Y-%m-%d %H',\`${el.table_id}\`.\`${el.column_name}\`) as \`${el.display_name}\``);

              }else if (_.isEqual(el.format, 'day_hour_minute')) {
                columns.push(`FORMAT_DATETIME( '%Y-%m-%d %H:%i',\`${el.table_id}\`.\`${el.column_name}\`) as \`${el.display_name}\``);

              }else if (_.isEqual(el.format, 'timestamp')) {
                columns.push(`FORMAT_DATETIME( '%Y-%m-%d %H:%i:%s',\`${el.table_id}\`.\`${el.column_name}\`) as \`${el.display_name}\``);

              } else if (_.isEqual(el.format, 'No')) {
                columns.push(`FORMAT_DATETIME('%Y-%m-%d', \`${el.table_id}\`.\`${el.column_name}\`) as \`${el.display_name}\``);

              }
            } else {
              columns.push(`FORMAT_DATETIME( '%Y-%m-%d', \`${el.table_id}\`.\`${el.column_name}\`) as \`${el.display_name}\``);
            }
          } else {
            columns.push(`\`${el.table_id}\`.\`${el.column_name}\` as \`${el.display_name}\``);
          }
          // GROUP BY
          //  Si es una única columna numérica no se agrega.
          if(  this.queryTODO.fields.length > 1  ||  el.column_type != 'numeric' ){
            grouping.push(`\`${el.display_name}\``);
          }
        }
      }
    });
    return [columns, grouping];
  }

  /**
   * 
   * @param filterObject 
   * @param type 
   * @returns filter to string. If type === having we are in a computed_column case, and colname = sql.expression wich defines column. 
   */

  public filterToString(filterObject: any, type: string) {

    const column = this.findColumn(filterObject.filter_table, filterObject.filter_column);
    if (!column.hasOwnProperty('minimumFractionDigits')) {
      column.minimumFractionDigits = 0;
    }
    const colname = type == 'where' ? `\`${filterObject.filter_table}\`.\`${filterObject.filter_column}\`` : `ROUND(  CAST( ${column.SQLexpression}  as numeric)  , ${column.minimumFractionDigits})`;
    let colType = column.column_type;

    switch (this.setFilterType(filterObject.filter_type)) {
      case 0:
        if (filterObject.filter_type === '!=') { filterObject.filter_type = '<>' }
        if (filterObject.filter_type === 'like') {
          return `${colname}  ${filterObject.filter_type} '%${filterObject.filter_elements[0].value1}%' `;
        }
        if (filterObject.filter_type === 'not_like') { 
          filterObject.filter_type = 'not like'
          return `${colname}  ${filterObject.filter_type} '%${filterObject.filter_elements[0].value1}%' `;
        }   
        return `${colname}  ${filterObject.filter_type} ${this.processFilter(filterObject.filter_elements[0].value1, colType)} `;
      case 1:
        if (filterObject.filter_type === 'not_in') { filterObject.filter_type = 'not in' }
        return `${colname}  ${filterObject.filter_type} (${this.processFilter(filterObject.filter_elements[0].value1, colType)}) `;
      case 2:
        return `${colname}  ${filterObject.filter_type} 
                        ${this.processFilter(filterObject.filter_elements[0].value1, colType)} and ${this.processFilterEndRange(filterObject.filter_elements[1].value2, colType)}`;
      case 3:
        return `${colname} is not null`;
    }
  }

  public processFilter(filter: any, columnType: string) {
    filter = filter.map(elem => {
      if (elem === null || elem === undefined) return 'ihatenulos';
      else return elem;
    });
    if (!Array.isArray(filter)) {
      switch (columnType) {
        case 'text': return `'${filter}'`;
        //case 'text': return `'${filter}'`;
        case 'numeric': return filter;
        case 'date': return `PARSE_DATE( '%Y-%m-%d','${filter}')`
      }
    } else {
      let str = '';
      filter.forEach(value => {
        const tail = columnType === 'date'
          ? `PARSE_DATE( '%Y-%m-%d','${value}')`
          : columnType === 'numeric' ? value : `'${String(value).replace(/'/g, "\\'")}'`;
        str = str + tail + ','
      });
      return str.substring(0, str.length - 1);
    }
  }


    /** this funciton is done to get the end of a date time range 2010-01-01 23:59:59 */
    public processFilterEndRange(filter: any, columnType: string) {
      filter = filter.map(elem => {
        if (elem === null || elem === undefined) return 'ihatenulos';
        else return elem;
      });
      if (!Array.isArray(filter)) {
        switch (columnType) {
          case 'text': return `'${filter}'`;
          //case 'text': return `'${filter}'`;
          case 'numeric': return filter;
          case 'date': return `PARSE_DATE( '%Y-%m-%d %H:%i:%S','${filter} 23:59:59')`
        }
      } else {
        let str = '';
        filter.forEach(value => {
          const tail = columnType === 'date'
            ? `PARSE_DATE( '%Y-%m-%d %H:%i:%S','${value} 23:59:59')`
            : columnType === 'numeric' ? value : `'${String(value).replace(/'/g, "\\'")}'`;
          str = str + tail + ','
        });
        return str.substring(0, str.length - 1);
      }
    }
  


  buildPermissionJoin(origin: string, joinStrings: string[], permissions: any[], schema?: string) {
    let table = origin;
    if (schema) {
      table = `${schema}.${origin}`;
    }
    let joinString = `( SELECT ${origin}.* from ${table} `;
    joinString += joinStrings.join(' ') + ' where ';
    permissions.forEach(permission => {
      joinString += ` ${this.filterToString(permission, 'where')} and `
    });
    return `${joinString.slice(0, joinString.lastIndexOf(' and '))} )`;
  }


  sqlQuery(query: string, filters: any[], filterMarks: string[]): string {
    //Get cols present in filters
    const colsInFilters = [];

    filters.forEach((filter, i) => {
      let col = filter.type === 'in' ?
        filter.string.slice(filter.string.indexOf('.') + 1, filter.string.indexOf(' in ')).replace(/\`/g, '') :
        filter.string.slice(filter.string.indexOf('.') + 1, filter.string.indexOf('between')).replace(/\`/g, '');
      colsInFilters.push({ col: col, index: i });
    });

    filterMarks.forEach((mark, i) => {

      let subs = mark.split('').slice(filterMarks[0].indexOf('{') + 1, mark.indexOf('}') - mark.indexOf('$')).join('');
      let col = subs.slice(subs.indexOf('.') + 1);
      let arr = [];

      if (!colsInFilters.map(f => f.col.toUpperCase().trim()).includes(col.toUpperCase().trim())) {

        arr.push(` ${subs} like '%'`);

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
    const output = [];
    const reg = new RegExp(/[\`.\[\]]/, "g");
    tables.forEach(table => {
      table = table.replace(schema, '');
      table = table.replace(reg, '');
      output.push(table);

    });
    return output;
  }
}


