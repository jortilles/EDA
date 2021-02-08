export abstract class AbstractConnection {
    
    config: any;
    pool: any

    constructor(config: any) {
        this.config = config;
    }

    itsConnected() {
        console.log('\x1b[36m%s\x1b[0m', 'Successfully connected to ' + this.config.type + ' database! \n');
    }

    async connect() {
        try {
            await this.tryConnection();
        } catch (e) {
            throw e;
        }
    }

    abstract createTable(queryData:any):string;

    abstract generateInserts(queryData:any):string;

    abstract  tryConnection(): Promise<void>;

    abstract  generateDataModel(optimize:string): Promise<any>;

    abstract  execQuery(query: string): Promise<any>;

    abstract  getDataSource(id: string): Promise<any>;

    abstract  getQueryBuilded(queryData: any, dataModel: any, user: any): Promise<any>;

    abstract  getPool():Promise<any>;

    abstract BuildSqlQuery(queryData: any, dataModel: any, user: any): string;

    abstract GetDefaultSchema():string;

    normalizeType(type: string) {
        let cleanType = type.replace(/ *\([^)]*\) */g, '').toUpperCase();
        switch (cleanType) {
            case 'NUMERIC': return 'numeric';
            case 'NUMBER': return 'numeric';
            case 'BIT': return 'numeric';
            case 'INT4': return 'numeric';
            case 'INT8': return 'numeric';
            case 'INT': return 'numeric';
            case 'INT64': return 'numeric';
            case 'INTEGER': return 'numeric';
            case 'TINYINT': return 'numeric';
            case 'SMALLINT': return 'numeric';
            case 'MEDIUMINT': return 'numeric';
            case 'BIGINT': return 'numeric';
            case 'SERIAL': return 'numeric';
            case 'DECIMAL': return 'numeric';
            case 'DEC': return 'numeric';
            case 'VARBINARY': return 'numeric';
            case 'DOUBLE': return 'numeric';
            case 'DOUBLE PRECISSION': return 'numeric';
            case 'FLOAT': return 'numeric';
            case 'FLOAT8': return 'numeric';
            case 'FLOAT16': return 'numeric';
            case 'FLOAT64' : return 'numeric';
            case 'REAL': return 'numeric';
            case 'LONG': return 'numeric';
            case 'DATE': return 'date';
            case 'TIMESTAMP': return 'date';
            case 'TIME': return 'date';
            case 'DATETIME': return 'date';
            case 'TIMESTAMPTZ': return 'date';
            case 'BOOL': return 'number';
            case 'BOOLEAN': return 'number';
            case 'TEXT': return 'text';
            case 'TINYTEXT': return 'text';
            case 'MEDIUMTEXT': return 'text';
            case 'LONGTEXT': return 'text';
            case 'VARCHAR': return 'text';
            case 'VARCHAR2': return 'text';
            case 'NVARCHAR': return 'text';
            case 'CHAR': return 'text';
            case 'NCHAR': return 'text';
            default : return 'text';
        }
    }

}

