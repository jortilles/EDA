import { EdaQueryParams, QueryBuilderService } from '../query-builder.service';
import * as _ from 'lodash';



export class MySqlBuilderService extends QueryBuilderService {
  parseSchema(tables: string[], schema: string) {
    return tables;
  }

      /** esto se usa para las consultas que hacemos a bbdd para generar el modelo */
   public simpleQuery(columns: string[], origin: string, view: boolean) {
    
        const schema = this.dataModel.ds.connection.schema;
        if (schema && !view) {
            origin = `\`${schema}\`.\`${origin}\``;
        }else{
           origin = `\`${origin}\``;
        }
        return `SELECT DISTINCT ${columns.join(', ')} \nFROM ${origin}`;
    }
  public analizedQuery(params: EdaQueryParams) {
    const {fields,columns,tables,origin,dest,joinTree,grouping,filters,havingFilters,joinType,valueListJoins,schema,}= params;
    let o = tables.filter(table => table.name === origin).map(table => { return table.query ? table.query : table.name })[0];

    const fromTable = tables
      .filter((table) => table.name === origin)
      .map((table) => {
        return table.query ? this.cleanViewString(table.query) : table.name;
      })[0];
    
    const vista = tables
    .filter((table) => table.name === origin)
    .map((table) => {
      return table.query ? true : false;
    })[0];
    
    const generateQuery = () => {
      let myQuery: string = "";
      
      //REVISAR VISTA
      if (vista) {
        myQuery += `FROM ${fromTable}`;
      } else {
        myQuery += `FROM ${fromTable}`;
        //myQuery += `FROM "${schema}"."${fromTable}"`;
      }
      
      // JOINS
      let joinString: any[];
      let alias: any;
      if (this.queryTODO.joined) {
        const responseJoins = this.setJoins(
          joinTree,
          joinType,
          schema,
          valueListJoins
        );
        joinString = responseJoins.joinString;
        alias = responseJoins.aliasTables;
      } else {
        joinString = this.getJoins(
          joinTree,
          dest,
          tables,
          joinType,
          valueListJoins,
          schema
        );
      }
      
      joinString.forEach((x) => {
        myQuery = myQuery + "\n" + x;
      });
      
      // WHERE
      myQuery += this.getFilters(filters, dest.length, o);
      
      if (alias) {
        for (const key in alias) {
          myQuery = myQuery.split(key).join(`${alias[key]}`);
        }
      }

      return myQuery;
    };

    const countTablesInSQL = (query: string) => {
      const normalizedQuery = query.toUpperCase();

      // Expresiones regulares para detectar FROM, JOIN
      const fromRegex = /\bFROM\b/g;
      const joinRegex = /\bJOIN\b/g;

      // Contar
      const fromCount = (normalizedQuery.match(fromRegex) || []).length;
      const joinCount = (normalizedQuery.match(joinRegex) || []).length;

      // Total de tablas implicadas
      // Cada FROM indica una tabla principal, y cada JOIN indica tablas adicionales
      const totalTables = fromCount + joinCount;
      return totalTables;
    };

    const querys: any = {};
    const fromQuery = generateQuery();

    querys["general"] = [
      `SELECT '${countTablesInSQL(fromQuery)}' AS "count_tables"`,
    ];

    
    for (const col of fields) {
      const diplayName = col.display_name;
      const table_column = `${col.table_id.split('.')[0]}.${col.column_name}`;
      
      let mainQuery = `(SELECT ${table_column} ${fromQuery}) AS main`;
      
      querys[diplayName] = [];
      // Source Table
      querys[diplayName].push(
        "SELECT \"" + `${col.table_id.split('.')[0]}` +"\" AS source_table  " 
      );
      // COUNT ROWS
      querys[diplayName].push(
        "SELECT COUNT(  * ) AS `count_rows` FROM " + `${col.table_id.split('.')[0]}`
      );

      
        if(col.column_type=='text' || col.column_type=='html'  ){

        // COUNT NULLS
        querys[diplayName].push(
          "SELECT SUM(CASE WHEN `main`." + `${col.column_name}` + " IS NULL THEN 1 ELSE 0 END) AS `count_nulls` FROM" + `${mainQuery}`
        );
        // COUNT EMPTY
        querys[diplayName].push(
          "SELECT SUM(CASE WHEN `main`." + `${col.column_name}` + " = '' THEN 1 ELSE 0 END) AS `count_empty` FROM" + `${mainQuery}`
        );
        // COUNT DISTINCT
        querys[diplayName].push(
          "SELECT COUNT(DISTINCT `main`." + `${col.column_name}` + ") AS `count_distinct` FROM" + `${mainQuery}`
        );
        // MostDuplicated
        querys[diplayName].push(
          "SELECT CONVERT( GROUP_CONCAT(`label_count`), CHAR) AS `most_duplicated` FROM (SELECT CONCAT(`main`." + `${col.column_name}`
          + ", ' (', COUNT(`main`." + `${col.column_name}` + ") , ')') AS `label_count` FROM " + 
          `${mainQuery}` + " GROUP BY `main`." + `${col.column_name}` + " ORDER BY COUNT(`main`." +
          `${col.column_name}` + ") DESC LIMIT 5 ) sub;"
        );
            // LeastDuplicated
        querys[diplayName].push(
          "SELECT CONVERT( GROUP_CONCAT(`label_count`), CHAR)  AS `least_duplicated` FROM (SELECT CONCAT(`main`." + `${col.column_name}`
          + ", ' (', COUNT(`main`." + `${col.column_name}` + ") , ')') AS `label_count` FROM " + 
          `${mainQuery}` + " GROUP BY `main`." + `${col.column_name}` + " ORDER BY COUNT(`main`." +
          `${col.column_name}` + ") ASC LIMIT 5 ) sub;"
        );
              
      } else if (col.column_type == "numeric") {
        // COUNT NULLS
        querys[diplayName].push(
          "SELECT SUM(CASE WHEN `main`." + `${col.column_name}` + " IS NULL THEN 1 ELSE 0 END) AS `count_nulls` FROM" + `${mainQuery}`
        );
        // MAX
        querys[diplayName].push(
          "SELECT MAX(`main`." + `${col.column_name}` + ") AS `max` FROM" + `${mainQuery}`
        );
        // MIN
        querys[diplayName].push(
          "SELECT MIN(`main`." + `${col.column_name}` + ") AS `min` FROM" + `${mainQuery}`
        );
        // MODA
        querys[diplayName].push(
          "WITH moda_counts AS (SELECT `main`." + `${col.column_name}` + " AS mode_value, COUNT(*) AS frequency FROM " +
          `${mainQuery}` + " GROUP BY 1 ORDER BY 2 DESC LIMIT 1) SELECT mode_value || ' (total: '|| frequency ||')' AS 'mode' FROM  moda_counts;");
        // AVG
        querys[diplayName].push(
          "SELECT   TRUNCATE( AVG(`main`." + `${col.column_name}` + ") ,3) AS `avg` FROM " + `${mainQuery}`
        );
        // MEDIAN
        querys[diplayName].push(

          "SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY `main`." + `${col.column_name}` + ") OVER () AS `median` FROM " + `${mainQuery}`
        );
      } else if (col.column_type == "date") {
        // CountNulls
        querys[diplayName].push(
          "SELECT SUM(CASE WHEN `main`." + `${col.column_name}` + " IS NULL THEN 1 ELSE 0 END) AS `count_nulls` FROM" + `${mainQuery}`
        );
        // MAX
        querys[diplayName].push(
          "SELECT TO_CHAR(MAX(`main`." + `${col.column_name}` + "),'YYYY-MM-DD') AS `max` FROM" + `${mainQuery}`
        );
        // MIN
        querys[diplayName].push(
          "SELECT TO_CHAR(MIN(`main`." + `${col.column_name}` + "),'YYYY-MM-DD') AS `min` FROM" + `${mainQuery}`
        );
        //GROUP BY MONT
        const queryMonth = "WITH monthly_counts AS (SELECT TO_CHAR(`main`." + `${col.column_name}` +
          ", 'YYYY-MM') AS vmonth, COUNT(*) AS total FROM " + `${ mainQuery }` + "GROUP BY 1)";
        // MEDIAN
        querys[diplayName].push(
          `${queryMonth}` +  "SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total) AS median_count_bymonth FROM monthly_counts;"
        );
        // MAX
        querys[diplayName].push(
          `${queryMonth}` + "SELECT (vmonth || ' (total: ' || total || ')') `max_bymonth` FROM monthly_counts ORDER BY total DESC LIMIT 1;"
        );
        // MIN
        querys[diplayName].push(
          `${queryMonth}` + "SELECT (vmonth || ' (total: ' || total || ')') `min_bymonth` FROM monthly_counts ORDER BY total ASC LIMIT 1;"
        );
      }
    }


    return querys;
  }

  public normalQuery(columns: string[], origin: string, dest: any[], joinTree: any[], grouping: any[], filters: any[], havingFilters: any[], 
    tables: Array<any>, limit: number,  joinType: string, groupByEnabled:boolean, valueListJoins: Array<any> ,schema: string, database: string, forSelector: any, sortedFilters: any[] ) {
   
    let o = tables.filter(table => table.name === origin).map(table => { return table.query ? table.query : table.name })[0];
    let myQuery = `SELECT ${columns.join(', ')} \nFROM ${o}`;

    /** IF IT IS A SELECT FOR A SELECTOR I WANT UNIQUE VALUES */
    if (forSelector === true) {
      myQuery = `SELECT DISTINCT ${columns.join(', ')} \nFROM ${o}`;
    }
    
    // If the element is a SQL Expression type
    if(this.queryTODO.fields[0].computed_column !== undefined && this.queryTODO.fields[0].computed_column == 'computed' ) {
      myQuery = `SELECT DISTINCT ${this.queryTODO.fields[0].SQLexpression} as \`${this.queryTODO.fields[0].column_name}\` ,   ${this.queryTODO.fields[0].SQLexpression} as \`id\`\nFROM ${o}`;
    }

    // JOINS
    let joinString: any[];
    let alias: any;
    // joined == EDA2
    if (this.queryTODO.joined) {
      /**tree */
      const responseJoins = this.setJoins(joinTree, joinType, schema, valueListJoins);
      joinString = responseJoins.joinString;
      alias = responseJoins.aliasTables;
    } else {
      /*EDA Normal*/
      joinString = this.getJoins(joinTree, dest, tables, joinType,  valueListJoins, schema);
    }

    joinString.forEach(x => {
      myQuery = myQuery + '\n' + x;
    });

    

    // WHERE
      // Check if AND | OR filter sort exists
    if(Array.isArray(sortedFilters) && sortedFilters.length !== 0) {
      myQuery += this.getSortedFilters(sortedFilters, filters); // sortedFilters has elements
    } else {
        myQuery += this.getFilters(filters, dest.length, o); // sortedFilters is empty
    }


    // GroupBy
    if (grouping.length > 0 && ((groupByEnabled))) {
      myQuery += '\ngroup by ' + grouping.join(', ');
    }

    //HAVING 
    myQuery += this.getHavingFilters(havingFilters);

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
    } else if (forSelector === true) {
      myQuery = `${myQuery}\norder by 1`;
    }

    if (limit){
      myQuery += `\nlimit ${limit}`;
    }else{
      myQuery += `\nlimit 20000`; // Por defecto limite 20000
    }    

    if (alias) {
      for (const key in alias) {
        myQuery = myQuery.split(key).join(`\`${alias[key]}\``);
      }
    }

    return myQuery;
  };

  public getFilters(filters, destLongitud, pTable): any { 

    /** If We Have permissions And No Destination I Add To Filters */

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
          /* Null control... query generated in a different way */
            if (   f.filter_type == 'is_null' && f.filter_elements[0].value1.length === 1 && filters.filter( (f)=>f.filter_column == column.column_name && f.filter_table == column.table_id ).length  >1 ) {// Si tengo varios filtros sobre una misma columna  es filtro por X o es nulo.
                   filtersString += `\nor ${colname}  is null `;
            } if (   f.filter_type == 'is_null' && f.filter_elements[0].value1.length === 1 && filters.filter( (f)=>f.filter_column == column.column_name && f.filter_table == column.table_id ).length  ==1 ) { // si solo tengo el filtro de nulo es un and porque digo 1=1 y es nulo.
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

// This function generates a SQL expression needed to add the permissions.
  public getSqlPermissionsExpresion(permissions: any) {
    let sql = '';
    if(!permissions.some((p: any) => p.toBeUsed)) return sql;
    
    permissions = permissions.filter(p => p.toBeUsed);

    const generarExpresionSQL = (permissions) => {
      const grupos = {};

      for (const filtro of permissions) {
        const tabla = filtro.filter_table;
        const columna = filtro.filter_column;
        const valor = filtro.filter_elements[0].value1[0];

        if (!grupos[tabla]) {
          grupos[tabla] = [];
        }

        grupos[tabla].push(`\`${tabla}\`.\`${columna}\` in (${valor})`);
      }

      const gruposOR = Object.values(grupos).map((columnas: any) => {
        return `( ${columnas.join(' OR ')} )`;
      });

      return gruposOR.join(' AND ');
    }

    return generarExpresionSQL(permissions);
  }

  public getSortedFilters(sortedFilters: any[], filters: any[]): any {

    let sqlPermissionsExpresion = this.getSqlPermissionsExpresion(this.permissions);

    // If the there is no filters 
    if(filters.length === 0) { return ''; }
    
    // Adding valueListSource to the filters And/Or
    filters.forEach((filter: any) => {
      if(filter.valueListSource !== undefined && filter.valueListSource !== null && filter.filter_id !== 'is_null') {
        sortedFilters.find((e: any) => e.filter_id === filter.filter_id ).valueListSource = filter.valueListSource;
      }
    })

    // Ordering the dashboard on the y-axis from lowest to highest.
    sortedFilters.sort((a: any, b: any) => a.y - b.y); 

    // Calculating global filters and they are empty.
    const nullSortedFilters  =  sortedFilters.filter((f: any) => ((f.isGlobal===true) && (f.filter_elements[0].value1.length === 0)));

    // If we have empty values in the filters we define a new sortedFilters
    if(nullSortedFilters.length !==0){

      // Ordering
      nullSortedFilters.sort((a: any, b: any) => a.y - b.y); 
  
      // Order in the x axis
      nullSortedFilters.forEach( element =>{
            for(let i= element.y + 1 ; i < sortedFilters.length; i++ ){
              if(element.x  < sortedFilters[i].x) {
                sortedFilters[i].x -= 1;
              } else {
                break;
              }
            }
      }  )
  
      // Order in the y axis
      const newSortedFilters = sortedFilters.filter((f: any) => !((f.isGlobal===true) && (f.filter_elements[0].value1.length === 0)));
      newSortedFilters.forEach( (f,i) => f.y=i );

      sortedFilters = _.cloneDeep(newSortedFilters);
    }

    // If we have a global filter with only one empty value selected
    filters.forEach(filter => {
      if(filter.isGlobal && (filter.filter_type === 'null_or_empty') && (filter.filter_elements[0].value1[0]==='emptyString')) {
        const selectedFilter = sortedFilters.find(sf => sf.filter_id === filter.filter_id);

        if(selectedFilter) {
          selectedFilter.filter_type = 'null_or_empty';
          selectedFilter.filter_elements = [];
        }
      }

      if(filter.filter_id === 'is_null') {
        const selectedFilter = sortedFilters.find(sf => sf.filter_id === filter.source_filter_id);
        selectedFilter.sqlOptional = '';
        
        if(selectedFilter){
          if(filter.valueListSource === undefined) {
            selectedFilter.sqlOptional += `\`${filter.filter_table}\`.\`${filter.filter_column}\` is null or \`${filter.filter_table}\`.\`${filter.filter_column}\` = '' or`;
            selectedFilter.filter_elements[0].value1 = selectedFilter.filter_elements[0].value1.filter(e => e !== 'emptyString');
          } else {
            selectedFilter.sqlOptional += `\`${filter.valueListSource.target_table}\`.\`${filter.valueListSource.target_id_column}\` is null or \`${filter.valueListSource.target_table}\`.\`${filter.valueListSource.target_id_column}\` = '' or`;
            selectedFilter.filter_elements[0].value1 = selectedFilter.filter_elements[0].value1.filter(e => e !== 'emptyString');
          }
        }

      }

    })

    // Checking the computed fields and SQLexpression added
    filters.forEach(filter => {
      if (filter.computed_column === 'computed') {
        const match = sortedFilters.find(sf => sf.filter_id === filter.filter_id);
        if (match) {
          match.computed_column = 'computed';
          match.SQLexpression = filter.SQLexpression;
        }
      }
    });
    
    // Variable containing the new string of nested AND/OR filters corresponding to the graphic design of the items.
    let stringQuery = '\nwhere ';

    // Adding needed permissions if we have some item in the array of permissions with toBeUsed in true
    if(sqlPermissionsExpresion !== '') stringQuery += `\n${sqlPermissionsExpresion}\nAND\n`; 

    // Recursive function for the necessary nesting according to the AND/OR filter graph.
    function cadenaRecursiva(item: any) {
      // recursive item
      const { cols, rows, y, x, filter_table, filter_column, filter_type, filter_column_type, filter_elements, filter_codes, value, valueListSource, sqlOptional, computed_column, SQLexpression } = item;

      ////////////////////////////////////////////////// filter_type ////////////////////////////////////////////////// 
      let filter_type_value = '';
      if(filter_type === 'not_in'){
        filter_type_value = 'not in';
      } else {
        if(filter_type === 'not_like') {
          filter_type_value = 'not like';
        } else {
          if(true){
            filter_type_value = filter_type;
          }
        }
      }

      ////////////////////////////////////////////////// filter_elements ////////////////////////////////////////////////// 
      let filter_elements_value = '';

      if(filter_elements.length === 0) {
        if(filter_type === 'not_null') {
          filter_type_value = 'is not null';
        }
        if(filter_type === 'not_null_nor_empty') {
          filter_type_value = 'is not null and';
        }
        if(filter_type === 'null_or_empty') {
          filter_type_value = 'is null or';
        }
      }
      else {
        // FOR ONE VALUE

        if(filter_elements[0].value1.length === 1){

          //Value of type text
          if(filter_column_type === 'text'){
            if(filter_type === 'in' || filter_type === 'not_in'){
              filter_elements_value = filter_elements_value + `(\'${filter_codes[0].value1[0]}\')`;
            } else {
              filter_elements_value = filter_elements_value + `'${filter_type === 'like' || filter_type === 'not_like'? '%': ''}${filter_codes[0].value1[0]}${filter_type === 'like' || filter_type === 'not_like'? '%': ''}'`;
            }
          } 

          // Numeric type value
          if(filter_column_type === 'numeric'){
            if(filter_type === 'between') {
              filter_elements_value = filter_elements_value + ` ${Number(filter_codes[0].value1[0])} and ${Number(filter_codes[1].value2[0])}`;
            } else {
              if(filter_type === 'in' || filter_type === 'not_in') {
                filter_elements_value = filter_elements_value + `(${filter_codes[0].value1[0]})`;
              } else {
                filter_elements_value = filter_elements_value + `${filter_codes[0].value1[0]}`;
              }
            }
          } 

          // Date type value
          if(filter_column_type === 'date'){
            if(filter_type === 'between'){
              filter_elements_value = filter_elements_value + ` STR_TO_DATE(\'${filter_codes[0].value1[0]}\',\'%Y-%m-%d\')` + ' and ' + `STR_TO_DATE(\'${filter_codes[1].value2[0]} 23:59:59\',\'%Y-%m-%d %H:%i:%S\')`;
            } else {
              if(filter_type==='in' || filter_type==='not_in') {
                filter_elements_value = filter_elements_value + `(STR_TO_DATE(\'${filter_codes[0].value1[0]}\',\'%Y-%m-%d\'))`;
              } else {
                filter_elements_value = filter_elements_value + `STR_TO_DATE(\'${filter_codes[0].value1[0]}\',\'%Y-%m-%d\')`;
              }
            }
          }

        } else {
          // FOR SEVERAL VALUES

          filter_elements_value = filter_elements_value + '(';

          // Text type values

          if(filter_column_type === 'text'){
            filter_codes[0].value1.forEach((element: any, index: number) => {
              filter_elements_value += `'${element}'` + `${index===(filter_codes[0].value1.length-1)? ')': ','}`;
            })
          }

          // Numeric type values
          if(filter_column_type === 'numeric'){
            filter_codes[0].value1.forEach((element: any, index: number) => {
              filter_elements_value += `${element}` + `${index===(filter_codes[0].value1.length-1)? ')': ','}`;
            })
          }

          // Date type values
          if(filter_column_type === 'date'){
            filter_codes[0].value1.forEach((element: any, index: number) => {
              filter_elements_value += `STR_TO_DATE(\'${element}\',\'%Y-%m-%d\')` + `${index===(filter_codes[0].value1.length-1)? ')': ','}`;
            })
          }

          // Values ​​that do not have a filter_column_type defined
          if(filter_column_type === undefined){
            filter_codes[0].value1.forEach((element: any, index: number) => {
              filter_elements_value += `'${element}'` + `${index===(filter_codes[0].value1.length-1)? ')': ','}`;
            })
          }
        }
      }

      ////////////////////////////////////////////////// Building the query sequence by item ////////////////////////////////////////////////// 

      // variable to find filters with valueListSource
      let validador = (valueListSource !== undefined && valueListSource !== null);
      // Result of the whole string 

      let resultado = '';

      if(computed_column==='computed') {
        resultado = `${['null_or_empty', 'not_null_nor_empty'].includes(filter_type) || (filter_type==='in' && sqlOptional !== undefined) ? ' (' : ''} ${sqlOptional !== undefined ? sqlOptional : ''} (${SQLexpression}) ${filter_type_value}${filter_elements_value}`;
      } else {
        resultado = `${['null_or_empty', 'not_null_nor_empty'].includes(filter_type) || (filter_type==='in' && sqlOptional !== undefined) ? ' (' : ''} ${sqlOptional !== undefined ? sqlOptional : ''} \`${ validador ? valueListSource.target_table : filter_table}\`.\`${ validador ? valueListSource.target_description_column : filter_column}\` ${filter_type_value}${filter_elements_value}`;
      }


      // It is located in this position because the table and field must be duplicated in the query (*observation)
      if(filter_type === 'not_null_nor_empty') {
        if(computed_column==='computed') {
          resultado = `${resultado} (${SQLexpression}) != '')`;
        } else {
          resultado = `${resultado} \`${ validador ? valueListSource.target_table : filter_table}\`.\`${ validador ? valueListSource.target_description_column : filter_column}\` != '')`;
        }
      }

      // It is located in this position because the table and field must be duplicated in the query (*observation)
      if(filter_type === 'null_or_empty') {
        if(computed_column==='computed') {
          resultado = `${resultado} (${SQLexpression}) = '')`;
        } else {
          resultado = `${resultado} \`${ validador ? valueListSource.target_table : filter_table}\`.\`${ validador ? valueListSource.target_description_column : filter_column}\` = '')`;
        }
      }

      if(filter_type === 'in' && sqlOptional !== undefined) {
        resultado = `${resultado} )`;
      }

      ////////////////////////////////////////////////// Arrays of child items ////////////////////////////////////////////////// 
      let elementosHijos = []; 

      for(let n = y+1; n<sortedFilters.length; n++){
        if(sortedFilters[n].x === x) break;
        if(y < sortedFilters[n].y && sortedFilters[n].x === x+1) elementosHijos.push(sortedFilters[n]);
      }

      // Variable that contains the next item of the item treated by the recursive function.
      const itemGenerico = sortedFilters.filter((item: any) => item.y === y + 1)[0];

      if(elementosHijos.length>0) {
        let space = '            '; // Jumps for indentation
        let variableSpace = space.repeat(x+1);

        let hijoArreglo = elementosHijos.map(itemHijo => {
          return cadenaRecursiva(itemHijo);
        })

        let hijosCadena = '';
        hijoArreglo.forEach((hijo, index) => {
          hijosCadena = hijosCadena + hijo;
          if(index<elementosHijos.length-1){
            hijosCadena = hijosCadena + ` \n ${variableSpace} ${elementosHijos[index+1].value.toUpperCase()} `
          }
        })

        resultado = `(${resultado} \n ${variableSpace} ${itemGenerico.value.toUpperCase()} (${hijosCadena}))`;
      }

      // Final result of the recursive function
      return resultado;
    }

    // Iterating the dashboard to get the correct nested string
    let itemsString = '( '
    for(let r=0; r<sortedFilters.length; r++){
      if(sortedFilters[r].x === 0){
        itemsString = itemsString +  (r === 0 ? '' : ' ' + sortedFilters[r].value.toUpperCase() + ' ' ) + sortedFilters.filter((e: any) => e.y===r).map(cadenaRecursiva)[0] + `\n`;
      } else {
        continue;
      }
    }

    itemsString = itemsString + ' )';
    stringQuery = stringQuery + itemsString

    // Final result of the constructed query
    return stringQuery;
  }

  public getJoins(joinTree: any[], dest: any[], tables: Array<any>, joinType:string, valueListJoins:Array<any>, schema:string): any {

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
          if (typeof joinColumns[0] === 'string') {
              // pero también puede ser que sea una columna calculada
              if(joinColumns[2] && joinColumns[2] === 'source' ){
                //si la columna calculada es el source
                joinString.push(` ${myJoin} join ${t} on ${joinColumns[1]}  = \`${e[i]}\`.\`${joinColumns[0]}\``);
              }else  if(joinColumns[2] && joinColumns[2] === 'target' ){
                // Si la columna calculada es el target
                joinString.push(` ${myJoin} join ${t} on \`${e[j]}\`.\`${joinColumns[1]}\` =  ${joinColumns[0]}`);
              }else{       
                // Si no es una columna calculada  
                joinString.push(` ${myJoin} join ${t} on \`${e[j]}\`.\`${joinColumns[1]}\` = \`${e[i]}\`.\`${joinColumns[0]}\``);
              } 
          } else {

            let join = ` ${myJoin} join ${t} on`;

            joinColumns[0].forEach((_, x) => {
              //  pero también puede ser que sea una columna calculada
              if(joinColumns[2] && joinColumns[2] === 'source' ){
                // Si la columna calculada es el source
                join += `  ${joinColumns[1][x]}  = \`${e[i]}\`.\`${joinColumns[0][x]}\` and`;
              }else  if(joinColumns[2] && joinColumns[2] === 'target' ){
                // Si la columna calculada es el source
                join += ` \`${e[j]}\`.\`${joinColumns[1][x]}\` =  ${joinColumns[0][x]}  and`;
              }else{   
                 // Si no es una columna calculada         
                join += ` \`${e[j]}\`.\`${joinColumns[1][x]}\` = \`${e[i]}\`.\`${joinColumns[0][x]}\` and`;
              }

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


  
  public setJoins(joinTree: any[], joinType: string, schema: string, valueListJoins: string[]) {
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

  public getMinFractionDigits(el:any): any{
    if (!el.hasOwnProperty('minimumFractionDigits')) {
      el.minimumFractionDigits = 0;
    }
    return el;
  }

  private getDateFormat(SQLexpression: string, fomrat: string): string {
    let result = '';
    switch (fomrat) {
      case 'year': result = `DATE_FORMAT(${SQLexpression} , '%Y') `;
        break;
      case 'quarter': result = `concat( concat( year(${SQLexpression}),'-Q' ),  quarter(${SQLexpression} ) ) `;
        break;
      case 'month': result = `DATE_FORMAT(${SQLexpression} , '%Y-%m')`;
        break;
      case 'week': result = `DATE_FORMAT(${SQLexpression} , '%x-%v') `;
        break;
      case 'day': result = `DATE_FORMAT(${SQLexpression} , '%Y-%m-%d') `;
        break;
      case 'week_day': result = `WEEKDAY(${SQLexpression} ) + 1 `;
        break;
      case 'day_hour': result = `DATE_FORMAT(${SQLexpression} , '%Y-%m-%d %H') `;
        break;
      case 'day_hour_minute': result = `DATE_FORMAT(${SQLexpression} , '%Y-%m-%d %H:%i') `;
        break;
      case 'timestamp': result = `DATE_FORMAT(${SQLexpression} , '%Y-%m-%d %H:%i:%s') `;
        break;
      default: result = `DATE_FORMAT(${SQLexpression} , '%Y-%m-%d') `;
        break;
    }
    return result;
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

      // Calculated columns are managed here
      if (el.computed_column === 'computed') {
        if(el.column_type=='text' || el.column_type=='html'  ){
          if(el.aggregation_type === 'none') { columns.push(` ${el.SQLexpression} as \`${el.display_name}\``);}
          else if(el.aggregation_type === 'count_distinct') {columns.push(` count( distinct ${el.SQLexpression} ) as \`${el.display_name}\``);}
          else {columns.push(` ${el.aggregation_type}(${el.SQLexpression}) as \`${el.display_name}\``);}
        }else if(el.column_type=='numeric'){
          if(el.aggregation_type === 'none') { columns.push(` cast( ${el.SQLexpression} ${whatIfExpression} as decimal(32,${el.minimumFractionDigits}))   as \`${el.display_name}\``);}
          else if(el.aggregation_type === 'count_distinct') { columns.push(` cast( count( distinct( ${el.SQLexpression} ${whatIfExpression})) as decimal(32,${el.minimumFractionDigits}))   as \`${el.display_name}\``);}
          else {columns.push(` cast( ${el.aggregation_type}(${el.SQLexpression} ${whatIfExpression}) as decimal(32,${el.minimumFractionDigits}))   as \`${el.display_name}\``);}
        }else if(el.column_type=='date'){
          if(el.aggregation_type === 'none') { columns.push( ` ${this.getDateFormat(el.SQLexpression, el.format)}  as \`${el.display_name}\``);}
          else if(el.aggregation_type === 'count_distinct') { columns.push(` count( distinct ${this.getDateFormat(el.SQLexpression, el.format)} ) as \`${el.display_name}\``);}
          else { columns.push(` ${el.aggregation_type}(${this.getDateFormat(el.SQLexpression, el.format) }) as \`${el.display_name}\``);}
        }else if(el.column_type=='coordinate'){
          if(el.aggregation_type === 'none') { columns.push(` ${el.SQLexpression} as \`${el.display_name}\``);}
          else if(el.aggregation_type === 'count_distinct') { columns.push(` count( distinct ${el.SQLexpression}) as \`${el.display_name}\``);}
          else {columns.push(` ${el.aggregation_type}(${el.SQLexpression}) as \`${el.display_name}\``);}
        }
        // GROUP BY
        if (el.column_type === 'date') {
           grouping.push(this.getDateFormat(el.SQLexpression, el.format) );
        } else {
          if( el.aggregation_type === 'none' && el.column_type != 'numeric') {
            grouping.push(` (${el.SQLexpression}) `);
          }
        }
      } else {
        if (el.aggregation_type !== 'none') {
          if (el.aggregation_type === 'count_distinct') {
            columns.push(`cast( count( distinct ${table_column}) ${whatIfExpression}  as decimal(32,${el.minimumFractionDigits||0}) )  as \`${el.display_name}\``);
          } else {
            columns.push(`cast(${el.aggregation_type}(${table_column})  ${whatIfExpression} as decimal(32,${el.minimumFractionDigits||0}) ) as \`${el.display_name}\``);
          }
        } else {
          if (el.column_type === 'numeric') {
            columns.push(`cast(${table_column} ${whatIfExpression}  as decimal(32,${el.minimumFractionDigits})) as \`${el.display_name}\``);
          } else if (el.column_type === 'date') {
             columns.push( this.getDateFormat(table_column, el.format)  + ` as \`${el.display_name}\``);
          } else {
              columns.push(`${table_column}  as \`${el.display_name}\``);
          }

          // GROUP BY
          if (el.column_type === 'date') {
            grouping.push(this.getDateFormat(table_column, el.format) );
          } else {
            //  Si es una única columna numérica no se agrega.
            if(  this.queryTODO.fields.length > 1  ||  el.column_type != 'numeric'  ||  // las columnas numericas que no se agregan
               ( el.column_type == 'numeric'  && el.aggregation_type == 'none' ) ){ // a no ser que se diga que no se agrega
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
      const valueListSource = filterObject.valueListSource;
      
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
          if(valueListSource !== undefined && this.queryTODO.queryMode === 'SQL') {
            return `${colname}  ${filterObject.filter_type} (${this.processFilterValueList(filterObject)}) `;
          } else {
            return `${colname}  ${filterObject.filter_type} (${this.processFilter(filterObject.filter_elements[0].value1, colType)}) `;
          }
        case 2:
          return `${colname}  ${filterObject.filter_type} 
                      ${this.processFilter(filterObject.filter_elements[0].value1, colType)} and ${this.processFilterEndRange(filterObject.filter_elements[1].value2, colType)}`;
        case 3:
          if(valueListSource !== undefined && this.queryTODO.queryMode === 'SQL') {
            return `${colname}  ${filterObject.filter_type} (${this.processFilterValueList(filterObject)}) `;
          } else {
            return `${colname} is not null`;
          }
        case 4:
          if(valueListSource !== undefined && this.queryTODO.queryMode === 'SQL') {
            return `${colname}  ${filterObject.filter_type} (${this.processFilterValueList(filterObject)}) `;
          } else {
            return `${colname} is null`;
          }
        case 5:
          if(valueListSource !== undefined && this.queryTODO.queryMode === 'SQL') {
            return `${colname}  ${filterObject.filter_type} (${this.processFilterValueList(filterObject)}) `;
          } else {
            return `${colname} is not null and ${colname} != ''`;
          }
        case 6:
          if(valueListSource !== undefined && this.queryTODO.queryMode === 'SQL') {
            return `${colname}  ${filterObject.filter_type} (${this.processFilterValueList(filterObject)}) `;
          } else {
            return `( ${colname} is null or ${colname} = '')`;
          }
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
        if(column.aggregation_type === 'count_distinct') {
          colname = `CAST( count( distinct (${column.SQLexpression})) as decimal(32,${column.minimumFractionDigits}))`;
        } else {
          colname = `CAST( ${column.aggregation_type}(${column.SQLexpression}) as decimal(32,${column.minimumFractionDigits}))`;
        }
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

  public processFilterValueList(filterObject: any) {

    // si estoy tratando nulos
    filterObject.filter_elements[0].value1.map(elem => {
      if (elem === null || elem === undefined || elem === 'null') return 'null'; //aqui poner 'null'
    });

    let str= 'select ';
    const target_table = filterObject.valueListSource.target_table;
    const target_id_column = filterObject.valueListSource.target_id_column;
    const target_description_column = filterObject.valueListSource.target_description_column;
    const filter_type = filterObject.filter_type;
    const values: string = `(${filterObject.filter_elements[0].value1.map((x: any) => `'${x}'`).join(', ')})`;

    str += `\`${target_table}\`.\`${target_id_column}\` from \`${target_table}\` where \`${target_description_column}\` in ${values}`;

    return str;
  }

  public processFilter(filter: any, columnType: string) {
    filter = filter.map(elem => {
      if (elem === null || elem === undefined || elem === 'null') return 'null'; //aqui poner 'null'
      else return elem;
    });

    if (!Array.isArray(filter)) {
      switch (columnType) {
        case 'text': return `'${filter}'`;
        case 'html': return `'${filter}'`;
        case 'numeric': return filter;
        case 'dynamic': return filter ;
        case 'date': return `STR_TO_DATE('${filter}','%Y-%m-%d')`
      }
    } else {
      let str = '';
      filter.forEach(value => {
        const tail = columnType === 'date'
          ? `STR_TO_DATE('${value}','%Y-%m-%d')`
          : columnType === 'numeric' ? value : `'${value.toString().replace(/'/g, "''")}'`;//agregado de toString
        str = str + tail + ','
      });

      // En el cas dels filtres de seguretat si l'usuari no pot veure res....
      filter.forEach(f => {
        if(f == '(x => None)'){
          switch (columnType) {
            case 'text': str = `'(x => None)'  `;   break; 
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
        case 'html': return `'${filter}'`;
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
    joinString += joinStrings.join(' ') + ' where ';
    permissions.forEach(permission => {
      joinString += ` ${this.filterToString(permission )} and `
    });
    return `${joinString.slice(0, joinString.lastIndexOf(' and '))} )`;
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
            if (type === 'text' || type === 'html') {
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

  /* Se pone el alias entre comillas para revitar errores de sintaxis*/
  private cleanViewString(query: string) {
    const index = query.lastIndexOf('as');
    query = query.slice(0, index) + `as "${query.slice(index + 3)}" `;
    return query;
  }
}