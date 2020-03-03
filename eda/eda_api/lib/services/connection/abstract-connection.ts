import { Client as PgClient } from 'pg';
import { createConnection , Connection as SqlConnection } from 'mysql';

export abstract class AbstractConnection {
    config: any;
    pool: PgClient | SqlConnection;

    constructor(config: any) {
        
        this.config = config;
        this.pool = getPool(this.config);
    }

    itsConnected() {
        console.log('\x1b[36m%s\x1b[0m', 'Successfully connected to '+ this.config.type +' database! \n');
    }

    async connect() {
        try {
            await this.tryConnection();
        } catch (e) {
            throw e;
        }
    }

    abstract async tryConnection(): Promise<void>;

    abstract async generateDataModel(): Promise<any>;

    abstract async execQuery(query: string): Promise<any>;

    abstract async getDataSource(id: string): Promise<any>;

    abstract async getQueryBuilded(queryData: any, dataModel: any, user: string): Promise<any>;

}

// Obte el Pool depenen del tipus de base de dades
function getPool(config: any): PgClient | SqlConnection  {
    switch (config.type) {
        case 'mssql':
        // return new MsPool(config);
        case 'mysql':
            return createConnection(config);
        case 'postgres':
            return new PgClient(config);
    }
}

