import { EdaQueryParams, QueryBuilderService } from './../query-builder.service';
import * as _ from 'lodash';


export class OracleBuilderService extends QueryBuilderService {
    public analizedQuery(params: EdaQueryParams) {
      return [];
    }

  public normalQuery(columns: string[], origin: string, dest: any[], joinTree: any[], grouping: any[], filters: any[], havingFilters: any[], 
    tables: Array<any>, limit: number,  joinType: string, valueListJoins: Array<any> ,schema: string, database: string, forSelector: any ) {
      
    let o = tables.filter(table => table.name === origin)
      .map(table => { return table.query ? this.cleanViewString(table.query) : table.name })[0];
    let myQuery = `SELECT ${columns.join(', ')} \nFROM ${o}`;

    /** SI ES UN SELECT PARA UN SELECTOR  VOLDRÉ VALORS ÚNICS */
       if (forSelector === true) {
        myQuery = `SELECT DISTINCT ${columns.join(', ')} \nFROM ${o}`;
      }
  
           
      let joinString: any[];
      let alias: any;
      if (this.queryTODO.joined) {
        const responseJoins = this.setJoins(joinTree, joinType, valueListJoins);
        joinString = responseJoins.joinString;
        alias = responseJoins.aliasTables;
      } else {
        joinString = this.getJoins(joinTree, dest, tables, joinType,  valueListJoins );
      }

 
    joinString.forEach(x => {
      myQuery = myQuery + '\n' + x;
    });

    // WHERE
    myQuery += this.getFilters(filters);

    // GroupBy
    if (grouping.length > 0) {
      myQuery += '\ngroup by ' + grouping.join(', ');
    }

    //HAVING 
    myQuery += this.getHavingFilters(havingFilters);

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

    if (alias) {
      console.log(alias);
      for (const key in alias) {
        myQuery = myQuery.split(key).join(`"${alias[key]}"`);
      }
    }


    if (limit) myQuery = `SELECT * FROM (${myQuery})\n WHERE ROWNUM <= ${limit}`;
    return myQuery;
  }

  public getFilters(filters: any ) {
    if (this.permissions.length > 0) {
      this.permissions.forEach(permission => { filters.push(permission); });
    }
    if (filters.length) {

      let equalfilters = this.getEqualFilters(filters);
      filters = filters.filter(f => !equalfilters.toRemove.includes(f.filter_id));
      let filtersString = `\nwhere 1=1 `;

      filters.forEach(f => {

        const column = this.findColumn(f.filter_table, f.filter_column);
        const colname = this.getFilterColname(column);
        if (f.filter_type === 'not_null') {
          filtersString += '\nand ' + this.filterToString(f);
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
                filtersString += `\nand (${this.filterToString(f)} or ${colname}  is null) `;
              } else {
                filtersString += `\nand (${this.filterToString(f)} or ${colname}  is not null) `;
              }
            }
          } else {
            filtersString += '\nand ' + this.filterToString(f);
          }
        }
      });

      /**Allow filter ranges */
      filtersString = this.mergeFilterStrings(filtersString, equalfilters );
      
      return filtersString;
    } else {
      return '';
    }
  }


  public getJoins(joinTree: any[], dest: any[], tables: Array<any>, joinType:string, valueListJoins:Array<any>) {

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
          let t = tables.filter(table => table.name === e[j])
            .map(table => { return table.query ? this.cleanViewString(table.query) : `"${table.name}"` })[0];
            if( valueListJoins.includes(e[j])   ){
              myJoin = 'left'; // Si es una tabla que ve del multivaluelist aleshores els joins son left per que la consulta tingui sentit.
            }else{
              myJoin = joinType; 
            }
          //Version compatibility string//array
          if (typeof joinColumns[0] === 'string') {

            joinString.push(` ${myJoin} join ${t} on "${e[j]}"."${joinColumns[1]}" = "${e[i]}"."${joinColumns[0]}"`);

          }
          else {

            let join = ` ${myJoin} join ${t} on`;

            joinColumns[0].forEach((_, x) => {

              join += ` "${e[j]}"."${joinColumns[1][x]}" = "${e[i]}"."${joinColumns[0][x]}" and`

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


  
  public setJoins(joinTree: any[], joinType: string, valueListJoins: string[]) {

    // Inicialización de variables
    const joinExists = new Set();
    const aliasTables = {};
    const joinString = [];
    const targetTableJoin = [];

    for (const join of joinTree) {

      // División de las partes de la join
      const sourceLastDotInx = join[0].lastIndexOf('.');
      // sourceTableAlias === join relation table_id
      const [sourceTable, sourceColumn] = [join[0].substring(0, sourceLastDotInx), join[0].substring(sourceLastDotInx + 1)];
      const [targetTable, targetColumn] = join[1].split('.');

      // Construcción de las partes de la join
      let sourceJoin = `"${sourceTable}"."${sourceColumn}"`;
      let targetJoin = `"${targetTable}"."${targetColumn}"`;

      // Si la join no existe ya, se añade
      if (!joinExists.has(`${sourceJoin}=${targetJoin}`)) {
          joinExists.add(`${sourceJoin}=${targetJoin}`);


          let aliasSource;
          if (sourceJoin.split('.')[0] == targetJoin.split('.')[0]) {
              aliasSource = `"${sourceTable}.${sourceColumn}"`;
          }
          
          // Construcción de los alias
          let alias = `"${targetTable}.${targetColumn}.${sourceColumn}"`;

          if (aliasSource) {
              alias = aliasSource;
          }

          aliasTables[alias] = targetTable;
          // aliasTables[sourceJoin] = targetTable;

          let aliasTargetTable: string;
          // targetTable and sourceTable can be the same table (autorelation)
          if (targetTableJoin.includes(targetTable) || targetTable == sourceTable) {
              // aliasTargetTable = `${targetTable}${targetTableJoin.indexOf(targetTable)}`;
              aliasTargetTable = `${targetTable}${sourceColumn}`;
              aliasTables[alias] = aliasTargetTable;
          }

          let joinStr: string;

          joinType = valueListJoins.includes(targetTable) ? 'LEFT' : joinType;


          if (aliasTargetTable) {
              targetJoin = `"${aliasTargetTable}"."${targetColumn}"`;
              joinStr = `${joinType} JOIN "${targetTable}" "${aliasTargetTable}" ON  ${sourceJoin}  =  ${targetJoin} `;
          } else {
              joinStr = `${joinType} JOIN "${targetTable}" ON  ${sourceJoin} = ${targetJoin} `;
          }

          // Si la join no se ha incluido ya, se añade al array
          if (!joinString.includes(joinStr)) {
              targetTableJoin.push(aliasTargetTable || targetTable);
              joinString.push(joinStr);
          }
      }
  }

    return {
      joinString,
      aliasTables
    };
  }


  
  public getSeparedColumns(origin: string, dest: string[]) {
    const columns = [];
    const grouping = [];

    this.queryTODO.fields.forEach(el => {
      el.order !== 0 && el.table_id !== origin && !dest.includes(el.table_id) ? dest.push(el.table_id) : false;

      let table_column;

      if (el.autorelation && !el.valueListSource && !this.queryTODO.forSelector ) {
        table_column = `"${el.joins[el.joins.length-1][0]}"."${el.column_name}"`;
      } else {
        table_column = `"${el.table_id}"."${el.column_name}"`;
      }

      let whatIfExpression = '';
      if (el.whatif_column) whatIfExpression = `${el.whatif.operator} ${el.whatif.value}`;

      el.minimumFractionDigits = el.minimumFractionDigits || 0;

      // Aqui se manejan las columnas calculadas
      if (el.computed_column === 'computed') {
        if(el.column_type=='text'){
          columns.push(`  ${el.SQLexpression}  as "${el.display_name}"`);
        }else if(el.column_type=='numeric'){
          columns.push(` ROUND(  CAST( ${el.SQLexpression}  ${whatIfExpression} as numeric)  , ${el.minimumFractionDigits} )    as "${el.display_name}"`);
        }else if(el.column_type=='date'){
          columns.push(`  ${el.SQLexpression}  as "${el.display_name}"`);
        }else if(el.column_type=='coordinate'){
          columns.push(`  ${el.SQLexpression}  as "${el.display_name}"`);
        }
        // GROUP BY
        if (el.format) {
          if (_.isEqual(el.format, 'year')) {
            grouping.push(`to_char(" ${el.SQLexpression} ", 'YYYY')`);
          } else if (_.isEqual(el.format, 'quarter')) {
            grouping.push(`to_char(" ${el.SQLexpression} ", 'YYYY-"Q"Q') `);
          } else if (_.isEqual(el.format, 'month')) {
            grouping.push(`to_char(" ${el.SQLexpression} ", 'YYYY-MM')`);
          } else if (_.isEqual(el.format, 'week')) {
            grouping.push(`to_char(" ${el.SQLexpression} ", 'IYYY-IW')`);
          } else if (_.isEqual(el.format, 'day')) {
            grouping.push(`to_char(" ${el.SQLexpression} ", 'YYYY-MM-DD')`);
          } else if (_.isEqual(el.format, 'day_hour')) {
            grouping.push(`to_char(" ${el.SQLexpression} ", 'YYYY-MM-DD HH')  `);
          } else if (_.isEqual(el.format, 'day_hour_minute')) {
            grouping.push(`to_char(" ${el.SQLexpression} ", 'YYYY-MM-DD HH:MI')  `);
          } else if (_.isEqual(el.format, 'timestamp')) {
            grouping.push(`to_char(" ${el.SQLexpression} ", 'YYYY-MM-DD HH:MI:SS')`);
          } else if (_.isEqual(el.format, 'week_day')) {
            grouping.push(`to_char(" ${el.SQLexpression} ", 'ID')`);
          } else if (_.isEqual(el.format, 'No')) {
            grouping.push(`" ${el.SQLexpression} `);
          }
        } else {
          if( el.column_type != 'numeric' ){ // Computed colums require agrregations for numeric
            grouping.push(` ${el.SQLexpression} `);
          }
        }

      } else {

        if (el.aggregation_type !== 'none') {
          if (el.aggregation_type === 'count_distinct') {
            columns.push(`ROUND(count(distinct ${table_column})  ${whatIfExpression} , ${el.minimumFractionDigits}) as "${el.display_name}"`);
          } else {
            columns.push(`ROUND(${el.aggregation_type}(${table_column}) ${whatIfExpression}  , ${el.minimumFractionDigits}) as "${el.display_name}"`);
          }
        } else {
          if (el.column_type === 'numeric') {
            columns.push(`ROUND(${table_column} ${whatIfExpression}, ${el.minimumFractionDigits})  as "${el.display_name}"`);
          } else if (el.column_type === 'date') {
            if (el.format) {
              if (_.isEqual(el.format, 'year')) {
                columns.push(`to_char(${table_column}, 'YYYY') as "${el.display_name}"`);
              } else if (_.isEqual(el.format, 'quarter')) {
                columns.push(`to_char(${table_column}, 'YYYY-"Q"Q') as "${el.display_name}"`);
              } else if (_.isEqual(el.format, 'month')) {
                columns.push(`to_char(${table_column}, 'YYYY-MM') as "${el.display_name}"`);
              } else if (_.isEqual(el.format, 'week')) {
                columns.push(`to_char(${table_column}, 'IYYY-IW') as "${el.display_name}"`);
              } else if (_.isEqual(el.format, 'week_day')) {
                columns.push(`to_char(${table_column}, 'D') as "${el.display_name}"`);
              } else if (_.isEqual(el.format, 'day')) {
                columns.push(`to_char(${table_column}, 'YYYY-MM-DD') as "${el.display_name}"`);
              }else if (_.isEqual(el.format, 'day_hour')) {
                columns.push(`to_char(${table_column}, 'YYYY-MM-DD HH24') as "${el.display_name}"`);
              }else if (_.isEqual(el.format, 'day_hour_minute')) {
                columns.push(`to_char(${table_column}, 'YYYY-MM-DD HH24:MI') as "${el.display_name}"`);
              }else if (_.isEqual(el.format, 'timestamp')) {
                columns.push(`to_char(${table_column}, 'YYYY-MM-DD HH24:MI:SS') as "${el.display_name}"`);
              }    else if (_.isEqual(el.format, 'No')) {
                columns.push(`to_char(${table_column}, 'YYYY-MM-DD') as "${el.display_name}"`);
              }
            } else {
              columns.push(`to_char(${table_column}, 'YYYY-MM-DD') as "${el.display_name}"`);
            }
          } else {
            columns.push(`${table_column} as "${el.display_name}"`);
          }
          // GROUP BY
          if (el.format) {
            if (_.isEqual(el.format, 'year')) {
              grouping.push(`to_char(${table_column}, 'YYYY')`);
            } else if (_.isEqual(el.format, 'quarter')) {
              grouping.push(`to_char(${table_column}, 'YYYY-"Q"Q')`);
            } else if (_.isEqual(el.format, 'month')) {
              grouping.push(`to_char(${table_column}, 'YYYY-MM')`);
            } else if (_.isEqual(el.format, 'week')) {
              grouping.push(`to_char(${table_column}, 'IYYY-IW')`);
            } else if (_.isEqual(el.format, 'week_day')) {
              grouping.push(`to_char(${table_column}, 'D')`);
            } else if (_.isEqual(el.format, 'day')) {
              grouping.push(`to_char(${table_column}, 'YYYY-MM-DD')`);
            }else if (_.isEqual(el.format, 'day_hour')) {
              grouping.push(`to_char(${table_column}, 'YYYY-MM-DD HH24') `);
            }else if (_.isEqual(el.format, 'day_hour_minute')) {
              grouping.push(`to_char(${table_column}, 'YYYY-MM-DD HH24:MI')  `);
            } else if (_.isEqual(el.format, 'timestamp')) {
              grouping.push(`to_char(${table_column}, 'YYYY-MM-DD HH24:MI:SS')`);
            } else if (_.isEqual(el.format, 'No')) {
              grouping.push(`${table_column}`);
            }
          } else {

            //  Si es una única columna numérica no se agrega.
            if(  this.queryTODO.fields.length > 1  ||  el.column_type != 'numeric' ||  // las columnas numericas que no se agregan
            ( el.column_type == 'numeric'  && el.aggregation_type == 'none' ) ){ // a no ser que se diga que no se agrega{
              grouping.push(`${table_column}`);
            }
            
          }

        }
      }
    });
    return [columns, grouping];
  }

  /**
   * 
   * @param filterObject 
   * @returns filter to string. If type === having we are in a computed_column case, and colname = sql.expression wich defines column. 
   */
  public filterToString(filterObject: any ) {

    const column = this.findColumn(filterObject.filter_table, filterObject.filter_column);
    if (!column.hasOwnProperty('minimumFractionDigits')) {
      column.minimumFractionDigits = 0;
    }
    const colname=this.getFilterColname(column);
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

  /**
   * 
   * @param column 
   * @returns coumn name in string mode for filtering. 
   */
  public getFilterColname(column: any){
    let colname:String ;
    if( column.computed_column == 'no'  || ! column.hasOwnProperty('computed_column') ){
        colname =  `"${column.table_id}"."${column.column_name}"` ;
   }else{
      if(column.column_type == 'numeric'){
        colname = `ROUND(  CAST( ${column.SQLexpression}  as numeric)  , ${column.minimumFractionDigits})`;
      }else{
        colname = `  ${column.SQLexpression}  `;
      }
    }
    return colname;
  }


  public getHavingFilters(filters: any ) {

    if (filters.length) {
      let filtersString = `\nhaving 1=1 `;

      filters.forEach(f => {

        const column = this.findHavingColumn(f.filter_table, f.filter_column);
        const colname = this.getHavingColname(column);

        if (f.filter_type === 'not_null') {
          filtersString += '\nand ' + this.havingToString(f );
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
                filtersString += `\nand (${this.havingToString(f )} or ${colname}  is null) `;
              } else {
                filtersString += `\nand (${this.havingToString(f )} or ${colname}  is not null) `;
              }
            }
          } else {
            filtersString += '\nand ' + this.havingToString(f );
          }
        }
      });
      return filtersString;
    } else {
      return '';
    }
  }


    /**
   * 
   * @param column 
   * @returns coumn name in string mode for having. 
   */
    public getHavingColname(column: any){
      let colname:String ;
      if( column.computed_column == 'no' ){
        colname =   `\`${column.table_id}\`.\`${column.column_name}\`` ;
      }else{
        if(column.column_type == 'numeric'){
          colname = `ROUND(  CAST( ${column.SQLexpression}  as numeric)  , ${column.minimumFractionDigits})`;
        }else{
          colname = `  ${column.SQLexpression}  `;
        }
      }
      return colname;
    }



  /**
   * 
   * @param filterObject 
   * @returns having filters  to string. 
   */
  public havingToString(filterObject: any ) {

    const column = this.findHavingColumn(filterObject.filter_table, filterObject.filter_column);
    if (!column.hasOwnProperty('minimumFractionDigits')) {
      column.minimumFractionDigits = 0;
    }    
    const  colname = this.getHavingColname(column) ;
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
        case 'date': return `to_date('${filter}','YYYY-MM-DD')`
      }
    } else {
      let str = '';
      filter.forEach(value => {
        const tail = columnType === 'date'
          ? `to_date('${value}','YYYY-MM-DD')`
          : columnType === 'numeric' ? value : `'${String(value).replace(/'/g, "''")}'`;
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
        case 'date': return `to_date('${filter} 23:59:59','YYYY-MM-DD HH24:MI:SS')`
      }
    } else {
      let str = '';
      filter.forEach(value => {
        const tail = columnType === 'date'
          ? `to_date('${value} 23:59:59','YYYY-MM-DD HH24:MI:SS')`
          : columnType === 'numeric' ? value : `'${String(value).replace(/'/g, "''")}'`;
        str = str + tail + ','
      });

      // En el cas dels filtres de seguretat si l'usuari no pot veure res....
      filter.forEach(f => {
        if(f == '(x => None)'){
          switch (columnType) {
            case 'text': str = `'(x => None)'  `;   break; 
            case 'numeric': str =  'null  ';   break; 
            case 'date': str =  `to_date('4092-01-01','YYYY-MM-DD')  `;   break; 
          }
        }
      });

      return str.substring(0, str.length - 1);
    }
  }


  

  buildPermissionJoin(origin: string, joinStrings: string[], permissions: any[], schema?: string) {

    if (schema) {
      origin = `${schema}.${origin}`;
    }
    let joinString = `( SELECT ${origin}.* from ${origin} `;
    joinString += joinStrings.join(' ') + ' where ';
    permissions.forEach(permission => {
      joinString += ` ${this.filterToString(permission)} and `
    });
    return `${joinString.slice(0, joinString.lastIndexOf(' and '))} )`;
  }


  sqlQuery(query: string, filters: any[], filterMarks: string[]): string {
    //Get cols present in filters
    const colsInFilters = [];

    filters.forEach((filter, i) => {
      let col = filter.type === 'in' ?
        filter.string.slice(filter.string.indexOf('.') + 1, filter.string.indexOf(' in ')).replace(/"/g, '') :
        filter.string.slice(filter.string.indexOf('.') + 1, filter.string.indexOf('between')).replace(/"/g, '');
      colsInFilters.push({ col: col, index: i });
    });

    filterMarks.forEach((mark, i) => {

      let subs = mark.split('').slice(filterMarks[0].indexOf('{') + 1, mark.indexOf('}') - mark.indexOf('$')).join('');
      let col = subs.slice(subs.indexOf('.') + 1);
      let arr = [];

      if (!colsInFilters.map(f => f.col.toUpperCase().trim()).includes(col.toUpperCase().trim())) {

        arr.push(`TO_CHAR(${subs}) like '%'`);

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
    const reg = new RegExp(/[".\[\]]/, "g");
    tables.forEach(table => {
      table = table.replace(schema, '')
      table = table.replace(reg, '')
      output.push(table);

    });
    return output;
  }

  private cleanViewString(query: string) {
    const index = query.lastIndexOf('as');
    query = query.slice(0, index) + `"${query.slice(index + 3)}"`;
    return query;
  }
}


