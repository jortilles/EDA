const applyConfigOverwrite = require('./apply-config-overwrite');

module.exports = applyConfigOverwrite('eda_api_config', {
    // we can modify the null value of the bbdd to give us another value read on the screen
    null_value: '',
    // Number of workers in cluster mode. If it is 0 or not defined, it uses all available cores.
    cluster_workers: 4,
    port: 8666,
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
    log_rotation_schedule: '0 0 * * *', // daily at midnight: archive yesterday's log_file and empty it in place
    custom_behaviour:{
      ALLOW_NON_ADMIN_MANAGE_PUBLIC_REPORTS: false, // true -> Non-admin users can manage "open" dashboards.
      USE_VALUE_LIST_CODE_FOR_FILTERS: false, // true -> For using the filters with code values.
      USE_RECURSIVE_PERMISSIONS: false, // true -> QueryBuilderService.builder() getRecursivePermissions (EDA). false -> with getFlatPermissions (SDA).
      RESTRICT_TABLE_TO_GRANTED_COLUMN: false // true -> closed model: granting permission on one column hides the rest of the table's columns (EDA). false -> row-level permissions never hide sibling columns (SDA).
    }
  });
