function RoutesAdmin(app, router) {
    app.use(`${router}/user`, require('./user.routes'));
    app.use(`${router}/groups`, require('./groups.routes'));
}

export default RoutesAdmin;