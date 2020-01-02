const RoutesUser = require('./user/loader');
const RoutesGlobal = require('./global/loader');
const RoutesDashboard = require('./dashboard/loader');
const RoutesDbManager = require('./db_manager/loader');
const RoutesDataSource = require('./data-source/loader');

module.exports = function(app) {
    RoutesUser(app, '/user');
    RoutesGlobal(app, '/global');
    RoutesDashboard(app, '/dashboard');
    RoutesDbManager(app, '/database-manager');
    RoutesDataSource(app, '/data-source');

};
