module.exports = function(app, router) {
  app.use(router, require('./data-source-routes'));
};