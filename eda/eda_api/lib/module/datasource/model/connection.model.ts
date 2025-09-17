function Connection(user, host, database, password, port, type, schema, poolLimit, sid, warehouse, ssl?, external?) {
    this.user = user;
    this.host = host;
    this.database = database;
    this.password = password;
    this.port = port;
    this.type = type;
    this.schema=schema;
    this.searchPath=schema;
    this.poolLimit=poolLimit;
    this.sid = sid;
    this.warehouse = warehouse;
    if(ssl){
        this.ssl = ssl;
    }
    this.external = external;

}

export default Connection;
