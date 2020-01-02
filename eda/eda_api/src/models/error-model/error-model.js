function errorModel( ok, message, error ) {
    this.ok = ok;
    this.message = message;
    this.error = error;
}

module.exports = errorModel;