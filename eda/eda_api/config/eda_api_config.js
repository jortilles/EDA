module.exports = {
    // we can modify the null value of the bbdd to give us another value read on the screen
    null_value: '',
    // Number of workers in cluster mode. If it is 0 or not defined, it uses all available cores.
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
    maxStatementTime: 900, // time before killing the MySQL query
    log_file: "XXXXXXXXXXXXXXXXXX", // server query log
    error_log_file: "XXXXXXXXXXXXXXXXXX", // server error log
    custom_behaviour:{
      ALLOW_NON_ADMIN_MANAGE_PUBLIC_REPORTS: false, // true -> Non-admin users can manage "open" dashboards.
      USE_FLAT_PERMISSIONS: false, // true -> QueryBuilderService.builder() getPermissions (EDA). false -> with getTreePermissions (SDA).
    }
  }