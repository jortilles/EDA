const applyConfigOverwrite = require('./apply-config-overwrite');

module.exports.ORCL = applyConfigOverwrite('bbdd_orcl', {
    bbdd_host: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    bbdd_user: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    bbdd_pass: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    bbdd_bbdd: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    bbdd_port: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    authorization_sql: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
  });