function Connection(user, host, database, password, port, type) {
    this.user = user;
    this.host = host;
    this.database = database;
    this.password = password;
    this.port = port;
    this.type = type;
}

export default Connection;
