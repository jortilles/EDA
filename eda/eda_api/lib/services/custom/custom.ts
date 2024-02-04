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
