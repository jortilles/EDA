function RoutesDataSource(app, router) {
    app.use(`${router}`, require('./datasource.routes'));
}

export default RoutesDataSource;
