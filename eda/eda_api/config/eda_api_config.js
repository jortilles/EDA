module.exports = {
    //podem modificar el valor null de la bbdd per a que ens otorgui un altre valor de lectura en pantalla
    null_value: '',
     authentication_type: {
      type: 'native',
      native: true,
      options: {
        authentication: "EDA",
        authorization: "EDA",
        elements: []
      }
    },
    log_file: "XXXXXXXXXXXXXXXXXX", // log de consoltas del servidor
    error_log_file: "XXXXXXXXXXXXXXXXXX" // log de errores del servidor
  }