const applyConfigOverwrite = require('./apply-config-overwrite');

module.exports.EDA_ORACLE_CLIENT = applyConfigOverwrite('oracle_config', '/eda/oracle/instantclient');