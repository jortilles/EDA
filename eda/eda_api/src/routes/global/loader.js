module.exports = function(app, router) {
    app.use(router + '/', require('./global-routes'));
};