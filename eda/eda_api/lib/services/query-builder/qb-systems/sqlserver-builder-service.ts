import { QueryBuilderService } from '../query-builder.service';
import * as _ from 'lodash';


export class SQLserviceBuilderService extends QueryBuilderService {


  public normalQuery(columns: string[], origin: string, dest: any[], joinTree: any[], grouping: any[], schema:string) {

    const SCHEMA = `${schema}`

    let myQuery = `SELECT ${columns.join(', ')} \nFROM "${SCHEMA}"."${origin}"`;

    const filters = this.queryTODO.filters;

    // JOINS
    const joinString = this.getJoins(joinTree, dest, SCHEMA);

    joinString.forEach(x => {
      myQuery = myQuery + '\n' + x;
    });

    // WHERE
    myQuery += this.getFilters(filters);

    // GroupBy
    if (grouping.length > 0) {
      myQuery += '\ngroup by ' + grouping.join(', ');
    }

    // OrderBy
    const orderColumns = this.queryTODO.fields.map(col => {
      let out;

      if (col.ordenation_type !== 'No' && col.ordenation_type !== undefined) {
        out = `"${col.display_name}" ${col.ordenation_type}`
      } else {
        out = false;
      }

      return out;
    }).filter(e => e !== false);

    const order_columns_string = orderColumns.join(',');
    if (order_columns_string.length > 0) {
      myQuery = `${myQuery}\norder by ${order_columns_string}`;
    }

    return myQuery;
  }

  public getFilters(filters) {
    if (this.permissions.length > 0) {
      this.permissions.forEach(permission => { filters.push(permission); });
    }
    if (filters.length) {
      let filtersString = '\nwhere 1 = 1 ';
      filters.forEach(f => {
        if (f.filter_type === 'not_null') {
          filtersString += '\nand ' + this.filterToString(f);
        } else {
          let nullValueIndex = f.filter_elements[0].value1.indexOf(null);
          if (nullValueIndex != - 1) {
            if (f.filter_elements[0].value1.length === 1) {
              filtersString += `\nand "${f.filter_table}"."${f.filter_column}"  is null `;
            } else {
              filtersString += `\nand (${this.filterToString(f)} or "${f.filter_table}"."${f.filter_column}"  is null) `;
            }
          } else {
            filtersString += '\nand ' + this.filterToString(f);
          }
        }
      });
      return filtersString;
    } else {
      return '';
    }
  }

  public getJoins(joinTree: any[], dest: any[], schema:string) {

    let joins = [];
    let joined = [];
    let joinString = [];

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
          joined.push(e[j]);
          joinString.push(`inner join "${schema}"."${e[j]}" on "${e[j]}"."${joinColumns[1]}" = "${e[i]}"."${joinColumns[0]}"`);
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

      if (el.aggregation_type !== 'none') {
        if (el.aggregation_type === 'count_distinct') {
          columns.push(`CAST(count( distinct "${el.table_id}"."${el.column_name}") AS DECIMAL(32, 2))as "${el.display_name}"`);
        } else {
          columns.push(`CAST(${el.aggregation_type}("${el.table_id}"."${el.column_name}") AS DECIMAL(32, 2)) as "${el.display_name}"`);
        }
      } else {
        if (el.column_type === 'numeric') {
          columns.push(`CAST("${el.table_id}"."${el.column_name}" AS DECIMAL(32, 2)) "${el.display_name}"`);
        } else if (el.column_type === 'date') {
          if (el.format) {
            if (_.isEqual(el.format, 'year')) {
              columns.push(`FORMAT(CAST("${el.table_id}"."${el.column_name}" AS DATE), 'yyyy' ) as "${el.display_name}"`);
            } else if (_.isEqual(el.format, 'month')) {
              columns.push(`FORMAT(CAST("${el.table_id}"."${el.column_name}" AS DATE), 'yyyy-MM' ) as "${el.display_name}"`);
            } else if (_.isEqual(el.format, 'day')) {
              columns.push(`FORMAT(CAST("${el.table_id}"."${el.column_name}" AS DATE), 'yyyy-MM-dd' ) as "${el.display_name}"`);
            } else if(_.isEqual(el.format, 'No')){
              columns.push(`FORMAT(CAST("${el.table_id}"."${el.column_name}" AS DATE), 'yyyy-MM-dd' ) as "${el.display_name}"`);
            }
          } else {
            columns.push(`FORMAT(CAST("${el.table_id}"."${el.column_name}" AS DATE), 'yyyy-MM-dd' ) as "${el.display_name}"`);
          }
        } else {
          columns.push(`"${el.table_id}"."${el.column_name}" as "${el.display_name}"`);
        }

        // GROUP BY
        if (el.format) {
          if (_.isEqual(el.format, 'year')) {
            grouping.push(`FORMAT(CAST("${el.table_id}"."${el.column_name}" AS DATE), 'yyyy' )`);
          } else if (_.isEqual(el.format, 'month')) {
            grouping.push(`FORMAT(CAST("${el.table_id}"."${el.column_name}" AS DATE), 'yyyy-MM' )`);
          } else if (_.isEqual(el.format, 'day')) {
            grouping.push(`FORMAT(CAST("${el.table_id}"."${el.column_name}" AS DATE), 'yyyy-MM-dd' )`);
          }else if(_.isEqual(el.format, 'No')){
            grouping.push(`"${el.table_id}"."${el.column_name}"`);
          }
        } else {
          grouping.push(`"${el.table_id}"."${el.column_name}"`);
        }
      }
    });
    return [columns, grouping];
  }

  public filterToString(filterObject: any) {
    let colType = this.findColumnType(filterObject.filter_table, filterObject.filter_column);
    switch (this.setFilterType(filterObject.filter_type)) {
      case 0:
        if (filterObject.filter_type === '!=') { filterObject.filter_type = '<>' }
        if (filterObject.filter_type === 'like') {
          return `"${filterObject.filter_table}"."${filterObject.filter_column}"  ${filterObject.filter_type} '%${filterObject.filter_elements[0].value1}%' `;
        }
        return `"${filterObject.filter_table}"."${filterObject.filter_column}"  ${filterObject.filter_type} ${this.processFilter(filterObject.filter_elements[0].value1, colType)} `;
      case 1:
        if (filterObject.filter_type === 'not_in') { filterObject.filter_type = 'not in' }
        return `"${filterObject.filter_table}"."${filterObject.filter_column}"  ${filterObject.filter_type} (${this.processFilter(filterObject.filter_elements[0].value1, colType)}) `;
      case 2:
        return `"${filterObject.filter_table}"."${filterObject.filter_column}"  ${filterObject.filter_type} 
                        ${this.processFilter(filterObject.filter_elements[0].value1, colType)} and ${this.processFilter(filterObject.filter_elements[1].value2, colType)}`;
      case 3:
        return `"${filterObject.filter_table}"."${filterObject.filter_column}" is not null`;
    }
  }

  public processFilter(filter: any, columnType: string) {
    filter = filter.map(elem => {
      if (elem === null || elem === undefined) return 'ihatenulos';
      else return elem;
    });
    if (!Array.isArray(filter)) {
      switch (columnType) {
        case 'varchar': return `'${filter}'`;
        //case 'text': return `'${filter}'`;
        case 'numeric': return filter;
        case 'date': return `to_date('${filter}','YYYY-MM-DD')`
      }
    } else {
      let str = '';
      filter.forEach(value => {
        const tail = columnType === 'date'
          ? `to_date('${value}','YYYY-MM-DD')`
          : columnType === 'numeric' ? value : `'${value.replace(/'/g, "''")}'`;
        str = str + tail + ','
      });
      return str.substring(0, str.length - 1);
    }
  }

}