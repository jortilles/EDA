const applyConfigOverwrite = require('./apply-config-overwrite');

module.exports = applyConfigOverwrite('mailing_config', {
  server_baseURL: 'http://localhost:4200/',
  server_apiURL:'http://localhost:8666',
  MAILING_SCHEDULE: '*/30 * * * *',
});
