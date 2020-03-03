function RoutesUploads(app, router) {
    app.use(`${router}`, require('./uploads.routes'));
}

export default RoutesUploads;
