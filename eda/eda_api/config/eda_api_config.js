module.exports = {
    //podem modificar el valor null de la bbdd per a que ens otorgui un altre valor de lectura en pantalla
    null_value: '',
    authentication_type: {
      type: 'sso',
      native: "true",
      options: {
        authentication: "sso",
        authorization: "sso",
        elements: ["saml", "oauth", "google", "microsoft"]
      }
    },
    log_file: "XXXXXXXXXXXXXXXXXX", // log de consoltas del servidor
    error_log_file: "XXXXXXXXXXXXXXXXXX" // log de errores del servidor
  }