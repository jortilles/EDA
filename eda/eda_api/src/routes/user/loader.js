module.exports = function(app, router) {
    app.use(router, require('./user-routes'));
    app.use(router + '/groups', require('./group-routes'));
};
