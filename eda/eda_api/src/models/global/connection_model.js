function connection(user, host, database, password, port) {
    this.user = user;
    this.host = host;
    this.database = database;
    this.password = password;
    this.port = port;
}

module.exports = connection;