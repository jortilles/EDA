module.exports = {
    //podem modificar el valor null de la bbdd per a que ens otorgui un altre valor de lectura en pantalla
    null_value: '',
    // Credenciales para el MCP integrado (/ia/mcp)
    mcp_email: process.env.MCP_EMAIL || 'pruebaAdmin',
    mcp_password: process.env.MCP_PASSWORD || 'pruebaAdmin',
    // Número de workers en modo cluster. Si es 0 o no se define, usa todos los núcleos disponibles.
    cluster_workers: 4,
     authentication_type: {
      type: 'native',
      native: true,
      options: {
        authentication: "EDA",
        authorization: "EDA",
        elements: []
      }
    },
    maxStatementTime: 900, // tiempo antes de hacer kill a la mysql query
    log_file: "XXXXXXXXXXXXXXXXXX", // log de consoltas del servidor
    error_log_file: "XXXXXXXXXXXXXXXXXX" // log de errores del servidor
  }