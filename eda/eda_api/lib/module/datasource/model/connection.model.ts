function Connection(user, host, database, password, port, type, schema, sid) {
    this.user = user;
    this.host = host;
    this.database = database;
    this.password = password;
    this.port = port;
    this.type = type;
    this.schema=schema;
    this.searchPath=schema;
    this.sid = sid;
}

export default Connection;
