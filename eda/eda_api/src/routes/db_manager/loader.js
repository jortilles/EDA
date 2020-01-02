module.exports = function(app, router) {
    app.use(router, require('./db_manager-routes'));
};