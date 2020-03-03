function RoutesDashboard(app, router) {
    app.use(`${router}`, require('./dashboard.routes'));
}

export default RoutesDashboard;
