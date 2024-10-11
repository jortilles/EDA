/*function Connection(user, host, database, password, port, type, schema, poolLimit, sid, warehouse, ssl?, external?) {
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

}*/


export default class ConnectionModel {
    public user: any;
    public host: any;
    public database: any;
    public password: any;
    public port: any;
    public type: any;
    public schema: any;
    public searchPath: any;
    public poolLimit: any;
    public sid: any;
    public warehouse: any;
    public ssl: any;
    public external: any;

    constructor(init: Partial<ConnectionModel>) {
        Object.assign(this, init);
    }

}