import { QueryBuilderService } from './../query-builder.service';
import * as _ from 'lodash';

 /*SDA CUSTOM*/ import * as custom from '../../custom/custom';


export class MySqlBuilderService extends QueryBuilderService {
  parseSchema(tables: string[], schema: string) {
    return tables;
  }

  public normalQuery(columns: string[], origin: string, dest: any[], joinTree: any[], grouping: any[], filters: any[], havingFilters: any[], 
    tables: Array<any>, limit: number,  joinType: string, valueListJoins: Array<any> ,schema: string, database: string, forSelector: any ) {
    let o = tables.filter(table => table.name === origin).map(table => { return table.query ? table.query : table.name })[0];
    let myQuery = `SELECT ${columns.join(', ')} \nFROM ${o}`;

    /** SI ES UN SELECT PARA UN SELECTOR  VOLDRÉ VALORS ÚNICS */
    if (forSelector === true) {
      myQuery = `SELECT DISTINCT ${columns.join(', ')} \nFROM ${o}`;
    }
 

    // JOINS
    let joinString: any[];
    let alias: any;
    // joined == EDA2
    if (this.queryTODO.joined) {
      /**tree */
      const responseJoins = this.setJoins(joinTree, joinType, schema, valueListJoins, dest.length);
      joinString = responseJoins.joinString;
      alias = responseJoins.aliasTables;
    } else {
      /*EDA Normal*/
      joinString = this.getJoins(joinTree, dest, tables, joinType,  valueListJoins, schema, dest.length);
    }

    joinString.forEach(x => {
      myQuery = myQuery + '\n' + x;
    });

    // WHERE
    myQuery += this.getFilters(filters, dest.length, o);

    // GroupBy
    if (grouping.length > 0) {
      myQuery += '\ngroup by ' + grouping.join(', ');
    }

    //HAVING 
    myQuery += this.getHavingFilters(havingFilters);


    /**SDA CUSTOM */  if (forSelector === true) {
    /**SDA CUSTOM */     myQuery += `\n UNION \n SELECT '' `;
    /**SDA CUSTOM */   }


    // OrderBy
    const orderColumns = this.queryTODO.fields.map(col => {
      let out;

      if (col.ordenation_type !== 'No' && col.ordenation_type !== undefined) {
        out = `\`${col.display_name}\` ${col.ordenation_type}`
      } else {
        out = false;
      }
      if(  col.rangesOrderExpression && col.rangesOrderExpression != undefined && col.ordenation_type !== 'No'){
        out = `${col.rangesOrderExpression} ${col.ordenation_type}`
      }

      return out;
    }).filter(e => e !== false);

    const order_columns_string = orderColumns.join(',');

    if (order_columns_string.length > 0) {
      myQuery = `${myQuery}\norder by ${order_columns_string}`;
    } else if (forSelector === true) {
      myQuery = `${myQuery}\norder by 1`;
    }

    if (limit) myQuery += `\nlimit ${limit}`;

    if (alias) {
      for (const key in alias) {
        myQuery = myQuery.split(key).join(`\`${alias[key]}\``);
      }
    }
  
    myQuery = this.queryAddedRange(this.queryTODO.fields, myQuery)

    return myQuery;
  };

  public queryAddedRange(fields, myQuery) {

    if(fields.find(field => field.ranges?.length > 0)) {

      if(fields.find(field => field.aggregation_type === 'count_distinct' || field.aggregation_type === 'sum' || field.aggregation_type === 'count')) {
        const fieldRango = fields.find(field => field.ranges.length > 0)
        myQuery = fieldRango.withRanges + myQuery + fieldRango.orderRanges;
        return myQuery
      } else {
        return myQuery
      }
      
    } else {
      return myQuery
    }

  }


  public getFilters(filters, destLongitud, pTable): any { 

    /** Si Tenemos Permisos Y No Hay Destino Lo Añado A Los Filtros */

    if ( this.permissions.length > 0 && destLongitud == 0) this.permissions.forEach( permission => { filters.push(permission); });
    else { this.permissions.forEach( permission => { if( permission.filter_table === pTable ) filters.push(permission);})}

    if (filters.length) {

      let equalfilters = this.getEqualFilters(filters);
      filters = filters.filter(f => !equalfilters.toRemove.includes(f.filter_id));
      let filtersString = `\nwhere 1 = 1 `;

      filters.forEach(f => {
        const column = this.findColumn(f.filter_table, f.filter_column);
        column.autorelation = f.autorelation;
        column.joins = f.joins;
        column.valueListSource = f.valueListSource;
        const colname = this.getFilterColname(column);
        if (f.filter_type === 'not_null' || f.filter_type === 'not_null_nor_empty' || f.filter_type === 'null_or_empty') {
          filtersString += '\nand ' + this.filterToString(f);
        } else {
          /* Control de nulos... se genera la consutla de forma diferente */
            if (   f.filter_type == 'is_null' && f.filter_elements[0].value1.length === 1 && filters.length >1 ) {// Si tengo varios filtors es filtro por X o es nulo.
                   filtersString += `\nor ${colname}  is null `;
            } if (   f.filter_type == 'is_null' && f.filter_elements[0].value1.length === 1 && filters.length ==1 ) { // si soolo tengo el filtro de nulo es un and poqque digo 1=1 y es nulo.
              filtersString += `\nand ${colname}  is null `;
            } else {  
                filtersString += `\nand (${this.filterToString(f)} ) `;
            }
        }
      });


      /**Allow filter ranges */
      filtersString = this.mergeFilterStrings(filtersString, equalfilters);
      return filtersString;
    } else {
      return '';
    }
  }

  public getJoins(joinTree: any[], dest: any[], tables: Array<any>, joinType:string, valueListJoins:Array<any>, schema:string, destLongitud: any): any {

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
          let t = tables.filter(table => table.name === e[j]).map(table => { return table.query ? table.query : `\`${table.name}\`` })[0];

          if( valueListJoins.includes(e[j])   ){
            myJoin = 'left'; // Si es una tabla que ve del multivaluelist aleshores els joins son left per que la consulta tingui sentit.
          }else{
            myJoin = joinType; 
          }
          //Version compatibility string//array

          let agregadoPermisos: any = '';
          if(destLongitud>0) {
            let equalfilters : any;
            let temporalPermissions: any = [];
  
            this.permissions.forEach( (p: any) => {
              if(p.filter_table == e[j]) {
                temporalPermissions.push(p)
              }
            })

            equalfilters = this.getEqualFilters(temporalPermissions);
            agregadoPermisos = this.mergeFilterStrings('', equalfilters)
            temporalPermissions = [];
          }
          else {agregadoPermisos = ''}


          if (typeof joinColumns[0] === 'string') {

            joinString.push(` ${myJoin} join ${t} on \`${e[j]}\`.\`${joinColumns[1]}\` = \`${e[i]}\`.\`${joinColumns[0]}\` ${agregadoPermisos}`);

          } else {

            let join = ` ${myJoin} join ${t} on`;

            joinColumns[0].forEach((_, x) => {

              join += ` \`${e[j]}\`.\`${joinColumns[1][x]}\` = \`${e[i]}\`.\`${joinColumns[0][x]}\` and`;

            });

            join = join.slice(0, join.length - 'and'.length);
            joinString.push(join + agregadoPermisos);

          }

          joined.push(e[j]);

        }
      }
    });

    return joinString;

  }


  
  public setJoins(joinTree: any[], joinType: string, schema: string, valueListJoins: string[], destLongitud: any) {
    // Inicialización de variables
    const joinExists = new Set();
    const aliasTables = {};
    let joinString = [];
    const targetTableJoin = [];


    for (const join of joinTree) {

        // División de las partes de la join
        const sourceLastDotInx = join[0].lastIndexOf('.');
        // sourceTableAlias === join relation table_id
        const [sourceTable, sourceColumn] = [join[0].substring(0, sourceLastDotInx), join[0].substring(sourceLastDotInx + 1)];
        const [targetTable, targetColumn] = join[1].split('.');

        // Construcción de las partes de la join
        let sourceJoin = `\`${sourceTable}\`.\`${sourceColumn}\``;
        let targetJoin = `\`${targetTable}\`.\`${targetColumn}\``;

        // Si la join no existe ya, se añade
        if (!joinExists.has(`${sourceJoin}=${targetJoin}`)) {
            joinExists.add(`${sourceJoin}=${targetJoin}`);


            let aliasSource;
            if (sourceJoin.split('.')[0] == targetJoin.split('.')[0]) {
                aliasSource = `\`${sourceTable}.${sourceColumn}\``;
            }
            
            // Construcción de los alias
            let alias = `\`${targetTable}.${targetColumn}.${sourceColumn}\``;

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
                targetJoin = `\`${aliasTargetTable}\`.\`${targetColumn}\``;
                joinStr = `${joinType} JOIN \`${targetTable}\` \`${aliasTargetTable}\` ON  ${sourceJoin}  =  ${targetJoin} `;
            } else {
                joinStr = `${joinType} JOIN \`${targetTable}\` ON  ${sourceJoin} = ${targetJoin} `;
            }

            // If the join has not already been included, it is added to the array
            if (!joinString.includes(joinStr)) {
                targetTableJoin.push(aliasTargetTable || targetTable);

                if(destLongitud>0) {
                  let equalfilters : any;
                  let agregadoPermisos: any;
                  let temporalPermissions: any = [];
        
                  this.permissions.forEach( (p: any) => {
                    if(p.filter_table == targetTable) {
                      temporalPermissions.push(p)
                    }
                  })

                  equalfilters = this.getEqualFilters(temporalPermissions);
                  agregadoPermisos = this.mergeFilterStrings('', equalfilters)
                  joinStr += agregadoPermisos;
                  temporalPermissions = [];
                }

                joinString.push(joinStr);
            }
        }
    }
    
    return {
        joinString,
        aliasTables
    };
  }

  /*SDA CUSTOM*/ @custom.muSqlBuilderServiceCustomGetMinFractionDigits
  public getMinFractionDigits(el:any): any{
    if (!el.hasOwnProperty('minimumFractionDigits')) {
      el.minimumFractionDigits = 0;
    }
    return el;
  }
  
  public getSeparedColumns(origin: string, dest: string[]): any {

    const columns = [];
    const grouping = [];

    this.queryTODO.fields.forEach(el => {
      el.order !== 0 && el.table_id !== origin && !dest.includes(el.table_id) ? dest.push(el.table_id) : false;

      let table_column;

      if (el.autorelation && !el.valueListSource && !this.queryTODO.forSelector ) {

        table_column = `\`${el.joins[el.joins.length-1][0]}\`.\`${el.column_name}\``;
      } else {
        table_column = `\`${el.table_id}\`.\`${el.column_name}\``;
      }

      let whatIfExpression = '';
      if (el.whatif_column) whatIfExpression = `${el.whatif.operator} ${el.whatif.value}`;


      el = this.getMinFractionDigits(el);

      // Aqui se manejan las columnas calculadas
      if (el.computed_column === 'computed') {
        if(el.column_type=='text'){
          columns.push(`  ${el.SQLexpression}  as \`${el.display_name}\``);
        }else if(el.column_type=='numeric'){
          columns.push(`cast( ${el.SQLexpression} as decimal(32,${el.minimumFractionDigits})) as \`${el.display_name}\``);
        }else if(el.column_type=='date'){
          columns.push(`  ${el.SQLexpression}  as \`${el.display_name}\``);
        }else if(el.column_type=='coordinate'){
          columns.push(`  ${el.SQLexpression}  as \`${el.display_name}\``);
        }
        // GROUP BY
        if (el.format) {
          if (_.isEqual(el.format, 'year')) {
            grouping.push(`DATE_FORMAT(${el.SQLexpression} , '%Y') `);
          } else if (_.isEqual(el.format, 'quarter')) {
            grouping.push(   `concat( concat( year(${el.SQLexpression}),'-Q' ),  quarter(${el.SQLexpression} ) ) ` );
          } else if (_.isEqual(el.format, 'month')) {
            grouping.push(`DATE_FORMAT(${el.SQLexpression} , '%Y-%m')`);
          } else if (_.isEqual(el.format, 'week')) {
            grouping.push(`DATE_FORMAT(${el.SQLexpression} , '%x-%v') `);
          } else if (_.isEqual(el.format, 'day')) {
            grouping.push(`DATE_FORMAT(${el.SQLexpression} , '%Y-%m-%d') `);
          } else if (_.isEqual(el.format, 'week_day')) {
            grouping.push(`WEEKDAY(${el.SQLexpression} ) + 1 `);
          }else if (_.isEqual(el.format, 'day_hour')) {
            grouping.push(`DATE_FORMAT(${el.SQLexpression} , '%Y-%m-%d %H') `);
          }else if (_.isEqual(el.format, 'day_hour_minute')) {
            grouping.push(`DATE_FORMAT(${el.SQLexpression} , '%Y-%m-%d %H:%i') `);
          }else if (_.isEqual(el.format, 'timestamp')) {
            grouping.push(`DATE_FORMAT(${el.SQLexpression} , '%Y-%m-%d %H:%i:%s') `);
          } else {
            grouping.push(`DATE_FORMAT(${el.SQLexpression} , '%Y-%m-%d') `);
          }
        } else {
          if( el.column_type != 'numeric' ){ // Computed colums require agrregations for numeric
            grouping.push(` ${el.SQLexpression} `);
          }
        }
      } else {
        if (el.aggregation_type !== 'none') {
          if (el.aggregation_type === 'count_distinct') {
            columns.push(`cast( count( distinct ${table_column}) as decimal(32,${el.minimumFractionDigits||0}) ) as \`${el.display_name}\``);
          } else {
            columns.push(`cast(${el.aggregation_type}(${table_column}) as decimal(32,${el.minimumFractionDigits||0}) ) as \`${el.display_name}\``);
          }
        } else {
          if (el.column_type === 'numeric') {
            columns.push(`cast(${table_column} as decimal(32,${el.minimumFractionDigits})) as \`${el.display_name}\``);
          } else if (el.column_type === 'date') {
            if (el.format) {
              if (_.isEqual(el.format, 'year')) {
                columns.push(`DATE_FORMAT(${table_column}, '%Y') as \`${el.display_name}\``);
              } else if (_.isEqual(el.format, 'quarter')) {
                columns.push(   `concat( concat( year(${table_column}),'-Q' ),  quarter(${table_column}) )  as \`${el.display_name}\`` );
              } else if (_.isEqual(el.format, 'month')) {
                columns.push(`DATE_FORMAT(${table_column}, '%Y-%m') as \`${el.display_name}\``);
              } else if (_.isEqual(el.format, 'week')) {
                columns.push(`DATE_FORMAT(${table_column}, '%x-%v') as \`${el.display_name}\``);
              } else if (_.isEqual(el.format, 'day')) {
                columns.push(`DATE_FORMAT(${table_column}, '%Y-%m-%d') as \`${el.display_name}\``);
              } else if (_.isEqual(el.format, 'week_day')) {
                columns.push(`WEEKDAY(${table_column}) + 1 as \`${el.display_name}\``);
              }else if (_.isEqual(el.format, 'day_hour')) {
                columns.push(`DATE_FORMAT(${table_column}, '%Y-%m-%d %H') as \`${el.display_name}\``);
              }else if (_.isEqual(el.format, 'day_hour_minute')) {
                columns.push(`DATE_FORMAT(${table_column}, '%Y-%m-%d %H:%i') as \`${el.display_name}\``);
              }else if (_.isEqual(el.format, 'timestamp')) {
                columns.push(`DATE_FORMAT(${table_column}, '%Y-%m-%d %H:%i:%s') as \`${el.display_name}\``);
              } else {
                columns.push(`DATE_FORMAT(${table_column}, '%Y-%m-%d') as \`${el.display_name}\``);
              }
            } else {
              columns.push(`DATE_FORMAT(${table_column}, '%Y-%m-%d') as \`${el.display_name}\``);
            }
          } else {

              columns.push(`${table_column} as \`${el.display_name}\``);

          }

          // GROUP BY
          if (el.format) {
            if (_.isEqual(el.format, 'year')) {
              grouping.push(`DATE_FORMAT(${table_column}, '%Y')`);
            } else if (_.isEqual(el.format, 'quarter')) {
              grouping.push(   `concat( concat( year(${table_column}),'-Q' ),  quarter(${table_column}) )  ` );
            } else if (_.isEqual(el.format, 'month')) {
              grouping.push(`DATE_FORMAT(${table_column}, '%Y-%m')`);
            } else if (_.isEqual(el.format, 'week')) {
              grouping.push(`DATE_FORMAT(${table_column}, '%x-%v')`);
            } else if (_.isEqual(el.format, 'week_day')) {
              grouping.push(`WEEKDAY(${table_column}) + 1`);
            } else if (_.isEqual(el.format, 'day')) {
              grouping.push(`DATE_FORMAT(${table_column}, '%Y-%m-%d')`);
            }else if (_.isEqual(el.format, 'day_hour')) {
              columns.push(`DATE_FORMAT(${table_column}, '%Y-%m-%d %H')  `);
            }else if (_.isEqual(el.format, 'day_hour_minute')) {
              grouping.push(`DATE_FORMAT(${table_column}, '%Y-%m-%d %H:%i')  `);
            }else if (_.isEqual(el.format, 'timestamp')) {
              grouping.push(`DATE_FORMAT(${table_column}, '%Y-%m-%d %H:%i:%s')`);
            } else {
              grouping.push(`${table_column}`);
            }
          } else {
            //  Si es una única columna numérica no se agrega.
            if(  this.queryTODO.fields.length > 1  ||  el.column_type != 'numeric' ){
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
   * @returns filter to string.  
   */
    public filterToString(filterObject: any): any {
      const column = this.findColumn(filterObject.filter_table, filterObject.filter_column);
      let colType = filterObject.filter_column_type;

      if( filterObject.filter_dynamic == true){
        colType = 'dynamic';
      }

      if (!column.hasOwnProperty('minimumFractionDigits')) {
        column.minimumFractionDigits = 0;
      }

      column.autorelation = filterObject.autorelation;
      column.joins = filterObject.joins || [];
      column.valueListSource = filterObject.valueListSource;
      const colname=this.getFilterColname(column);
      
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
          // in values
        case 1:
          if (filterObject.filter_type === 'not_in') { filterObject.filter_type = 'not in' }
          return `${colname}  ${filterObject.filter_type} (${this.processFilter(filterObject.filter_elements[0].value1, colType)}) `;
        case 2:
          return `${colname}  ${filterObject.filter_type} 
                      ${this.processFilter(filterObject.filter_elements[0].value1, colType)} and ${this.processFilterEndRange(filterObject.filter_elements[1].value2, colType)}`;
        case 3:
          return `${colname} is not null`;
        case 4:
            return `${colname} is null`;
        case 5:
          return `${colname} is not null and ${colname} != ''`;
        case 6:
          return `( ${colname} is null or ${colname} = '')`;
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

      if (column.autorelation && !column.valueListSource) {
        colname = `\`${column.joins[column.joins.length-1][0]}\`.\`${column.column_name}\``;
      } else {
        colname = `\`${column.table_id}\`.\`${column.column_name}\`` ;
      }
      
    }else{
      if(column.column_type == 'numeric'){
        colname = `CAST( ${column.SQLexpression} as decimal(32,${column.minimumFractionDigits}))`;
      }else{
        colname = `  ${column.SQLexpression}  `;
      }
    }
    
    return colname;
  }
  
      /**
   * 
   * @param filterObject 
   * @returns clausula having en un string.  
   */
  public getHavingFilters(filters ): any {

    if (filters.length) {

      let filtersString = `\nhaving 1=1 `;

      filters.forEach(f => {
        const column = this.findHavingColumn(f);
        column.autorelation = f.autorelation;
        column.joins = f.joins;
        const colname = this.getHavingColname(column);
        if (f.filter_type === 'not_null') {
          filtersString += `\nand ${colname}  is not null `;
        }else if (f.filter_type === 'not_null_nor_empty') {
          filtersString += `\nand ${colname}  is not null and ${colname} != ''  `;
        }else if (f.filter_type === 'null_or_empty') {
          filtersString += `\nand ( ${colname}  is null or ${colname} != ''  ) `;
        }  else {
          /* Control de nulos... se genera la consutla de forma diferente */
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
                filtersString += `\nand (${this.havingToString(f)} or ${colname}  is null) `;
              } else {
                filtersString += `\nand (${this.havingToString(f)} or ${colname}  is not null) `;
              }
            }
          } else {
            filtersString += '\nand ' + this.havingToString(f);
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

  let colname:String  ;
  if( column.computed_column === 'no'  || !column.hasOwnProperty('computed_column') ){
    let table_id = column.table_id;

    if (column.autorelation && !column.valueListSource) {
        table_id = column.joins[column.joins.length-1][0];
    }

    if(column.aggregation_type === 'count_distinct') {
      colname = `cast( count( distinct \`${table_id}\`.\`${column.column_name}\`) as decimal(32,${column.minimumFractionDigits||0}) ) ` ;
    } else {
      colname = `cast(${column.aggregation_type}(\`${table_id}\`.\`${column.column_name}\`) as decimal(32,${column.minimumFractionDigits||0}) ) ` ;
    }
    
  }else{
    if(column.column_type == 'numeric'){
      colname = `CAST( ${column.SQLexpression} as decimal(32,${column.minimumFractionDigits}))`;
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
 public havingToString(filterObject: any) {
    const column = this.findHavingColumn(filterObject);
    column.autorelation = filterObject.autorelation;
    column.joins = filterObject.joins;

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
      if (elem === null || elem === undefined || elem === 'null') return 'null'; //aqui poner 'null'
      else return elem;
    });

    if (!Array.isArray(filter)) {
      switch (columnType) {
        case 'text': return `'${filter}'`;
        case 'dynamic': return filter ;
        //case 'text': return `'${filter}'`;
        case 'numeric': return filter;
        case 'date': return `STR_TO_DATE('${filter}','%Y-%m-%d')`
      }
    } else {
      let str = '';
      filter.forEach(value => {
        const tail = columnType === 'date'
          ? `STR_TO_DATE('${value}','%Y-%m-%d')`
          : columnType === 'numeric' ? value : `'${value.replace(/'/g, "''")}'`;
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

      
      if(columnType == 'dynamic'){
        return filter;
      }

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
        case 'date': return `STR_TO_DATE('${filter} 23:59:59','%Y-%m-%d %H:%i:%S')`
      }
    } else {
      let str = '';
      filter.forEach(value => {
        const tail = columnType === 'date'
          ? `STR_TO_DATE('${value} 23:59:59','%Y-%m-%d %H:%i:%S')`
          : columnType === 'numeric' ? value : `'${value.replace(/'/g, "''")}'`;
        str = str + tail + ','
      });
      return str.substring(0, str.length - 1);
    }
  }


  buildPermissionJoin(origin: string, joinStrings: string[], permissions: any[]) {

    let joinString = `( SELECT ${origin}.* from ${origin} `;
    joinString += joinStrings.join(' ') + ' where 1=1  ';

    const equalfilters = this.getEqualFilters(permissions);
    permissions = permissions.filter(f => !equalfilters.toRemove.includes(f.filter_id));

    permissions.forEach(permission => {
      joinString += ` ${this.filterToString(permission )} and `
    });
    if(permissions.length > 0 && equalfilters.toRemove.length == 0){
      joinString.slice(0, joinString.lastIndexOf(' and '))
    }
    joinString = this.mergeFilterStrings(joinString , equalfilters);

    
    return `${joinString} )`;
  }

  sqlQuery(query: string, filters: any[], filterMarks: string[]): string {

    //Get cols present in filters
    const colsInFilters = [];

    filters.forEach((filter, i) => {
      let col = filter.type === 'in' ?
        filter.string.slice(filter.string.indexOf('.') + 1, filter.string.indexOf(' in ')).replace(/`/g, '') :
        filter.string.slice(filter.string.indexOf('.') + 1, filter.string.indexOf('between')).replace(/`/g, '');
      colsInFilters.push({ col: col, index: i });
    });

    filterMarks.forEach((mark, i) => {

      let subs = mark.split('').slice(filterMarks[0].indexOf('{') + 1, mark.indexOf('}') - mark.indexOf('$')).join('');
      let col = subs.slice(subs.indexOf('.') + 1);
      let arr = [];

      if (!colsInFilters.map(f => f.col.toUpperCase().trim()).includes(col.toUpperCase().trim())) {

        arr.push(`${subs} like '%'`);

      } else {
        const index = colsInFilters.filter(f => f.col.toUpperCase().trim() === col.toUpperCase().trim()).map(f => f.index)[0];
        arr = filters[index].string.split(' ');
        arr[0] = subs;
      }
      query = query.replace(mark, arr.join(' '));
    });

    return query;
  }

  
  public createTable(queryData: any) {
    let create = `CREATE TABLE ${queryData.tableName} ( `;
    queryData.columns.forEach(col => {
        create += ` \`${this.abc_123(col.field)}\` ${this.getMysqlColType(col.type)}, `;
    });
    create = create.slice(0, -2);
    create += ' );'
    return create;
}

public abc_123(str: string): string {
    return str.replace(/[^\w\s]/gi, '').replace(/ /gi, '_');
}

public generateInserts(queryData: any) {
    let insert = `INSERT INTO ${queryData.tableName} VALUES\n`;
    queryData.data.forEach((register) => {
        let row = '('
        Object.values(register).forEach((value: any, i) => {
            const type = queryData.columns[i].type;
            if (type === 'text') {
                row += `'${value.replace(/'/g, "''")}',`;
            } else if (type === 'timestamp') {
                let date = value ? `STR_TO_DATE('${value}', '${this.getMysqlDateFormat( queryData.columns[i].format)}'),` : `${null},`
                row += `${date}`;
            } else {
                value = queryData.columns[i].separator === ',' ? parseFloat(value.replace(".", "").replace(",", "."))
                    : parseFloat(value.replace(",", ""));
                value = value ? value : null;
                row += `${value},`;
            }
        });
        row = row.slice(0, -1);
        row += ')';
        insert += `${row},`
    });
    insert = insert.slice(0, -1);
    return insert;
  }

  public getMysqlDateFormat(format:string){
    
  const f = format.replace('YYYY', '%Y').replace('MM', '%m').replace('DD', '%d').replace('HH','%H').replace('MI','%i').replace('SS','%s');
  return f; 
  }

  public getMysqlColType(type:string){
    const t = type.replace('numeric','decimal(10,4)');
    return t;
  }


}