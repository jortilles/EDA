/**
   * Modifica la propiedad `minimumFractionDigits` de un objeto basado en condiciones específicas.
   * Se utiliza para forzar a dos decimales los calculos de promedio en SinergiaDA
   * https://github.com/SinergiaTIC/SinergiaDA/pull/67
   * 
   * @param {Object} target - El objeto al cual está adjunto el descriptor.
   * @param {string} propertyKey - La clave de la propiedad a la que se está adjuntando el descriptor.
   * @param {any} descriptor - El descriptor de propiedad para la función.
   * @returns {any} El descriptor modificado.
   * 
   * La función intercepta el llamado a la propiedad y modifica el objeto `el`.
   * Si `el` no tiene la propiedad `minimumFractionDigits`, se establece a 0.
   * Si `el.aggregation_type` es 'avg', se establece `minimumFractionDigits` a 2.
   */
export function muSqlBuilderServiceCustomGetMinFractionDigits(target: Object, propertyKey: string, descriptor: any) {
  descriptor.value = function(el: any) {
    if (!el.hasOwnProperty("minimumFractionDigits")) {
      el.minimumFractionDigits = 0;
    }
    /*SDA CUSTOM*/ if (el.aggregation_type === "avg") {
    /*SDA CUSTOM*/ el.minimumFractionDigits = 2;
    /*SDA CUSTOM*/
    }
    return el;
  };
  return descriptor;
}



/**
   * Modifica la propiedad `getTreePermissions`  
   * Se utiliza para eliminar la recursividad de los permisos en  SinergiaDA
   * https://github.com/SinergiaTIC/SinergiaDA/issues/132
   * 
   * @param {Object} target - El objeto al cual está adjunto el descriptor.
   * @param {string} propertyKey - La clave de la propiedad a la que se está adjuntando el descriptor.
   * @param {any} descriptor - El descriptor de propiedad para la función.
   * @returns {any} El descriptor modificado.
   * 
   * La función recibe los permisos del model y la consulta
   * y le añade los where que tocan para propagar los permisos.
   */
export function queryBuilderServiceCustomGetTreePermissions(target: Object, propertyKey: string, descriptor: any) {
  descriptor.value = function(modelPermissions:any,  query:any) {
 /**
 * Tento todos los permisos modelPermissions
 * Tengo mi consulta query
 * Tengo que añadir los wheres que tocan a la consulta para implmentar los permisos.
 **/      

 //console.log('Custom Tree Model permissions');
 let filters = [];
 let columns = [];
 
 const permissions = this.getUserPermissions(modelPermissions);
 //console.log(permissions);
 
 query.fields.forEach(f => {
     columns.push( { table_name:  f.table_id,  column_name: f.column_name } )
 
 });
 query.filters.forEach(f => {
     columns.push( { table_name:  f.filter_table,  column_name: f.filter_column } )
 
 });
 
 let found = -1;
 if (columns.length > 0  && permissions !== null) {
     permissions.forEach(permission => {
        found = columns.findIndex((t: any) => t.table_name.split('.')[0] === permission.table);
         if (found >= 0) {
             if(permission.dynamic){
                     permission.value[0] =  permission.value[0].toString().replace("EDA_USER", this.usercode) 
                    
             }
             let filter = {
                 filter_table: permission.table,
                 filter_column: permission.column,
                 filter_type: 'in',
                 filter_dynamic: permission.dynamic?permission.dynamic:false,
                 filter_elements: [{ value1: permission.value }]
             };
 
             filters.push(filter);
             found = -1;
         }
     });
 }
 
 return filters;
  };
  return descriptor;
}

