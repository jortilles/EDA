module.exports = {
    //podem modificar el valor null de la bbdd per a que ens otorgui un altre valor de lectura en pantalla
    null_value: '',
    authentication_type: {
      type: 'sso_mixto',
      native: true,
      options: {
        authentication: "saml",
        authorization: "bbdd_orcl",
        elements: []
      }
    },
  }