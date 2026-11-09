import { SQLserverConnection } from '../../services/connection/db-systems/slqserver-connection';
import { AOC_AMBITOS_MAP } from './aoc-ambitos.map';

const odbc = require('odbc');

export interface AocAmbito {
    technicalName: string;
    label: string;
}

/** Envuelve un valor para un connection string ODBC: entre llaves, escapando '}' literales */
function odbcQuote(value: string): string {
    return `{${String(value).replace(/}/g, '}}')}}`;
}

/**
 * Conector AOC: mismo generateDataModel/query builder que SQLserverConnection, pero el datalake
 * de AOC es un endpoint de Microsoft Fabric. El driver de Node 'mssql'/tedious no es compatible
 * con Fabric (falla con "socket hang up" incluso bien configurado: es un problema conocido y sin
 * solución oficial, https://github.com/tediousjs/tedious/issues/1563). Por eso este conector usa
 * en su lugar el Microsoft ODBC Driver 18 for SQL Server (vía el paquete 'odbc'), que sí soporta
 * Fabric oficialmente — es el mismo driver que usan DBeaver/SSMS por debajo.
 * this.config.user / this.config.password son aquí el clientId / clientSecret del Service
 * Principal de Microsoft Entra ID que da acceso al datalake.
 */
export class AOCConnection extends SQLserverConnection {

    async getclient(): Promise<any> {
        const connectionString =
            `Driver={ODBC Driver 18 for SQL Server};` +
            `Server=${this.config.host},${this.config.port};` +
            `Database=${this.config.database};` +
            `Authentication=ActiveDirectoryServicePrincipal;` +
            `UID=${odbcQuote(this.config.user)};` +
            `PWD=${odbcQuote(this.config.password)};` +
            `Encrypt=yes;TrustServerCertificate=no;`;

        return odbc.connect(connectionString);
    }

    async execQuery(query: string): Promise<any> {
        return this.client.query(query);
    }

    async execSqlQuery(query: string): Promise<any> {
        return this.execQuery(query);
    }

    /** Igual que SQLserverConnection.countTable, pero devolviendo filas de odbc en vez de mssql */
    protected async countTable(tableName: string, schema: string): Promise<any> {
        const query = `SELECT count(*) as count from ${schema}.${tableName}`;
        try {
            const rows = await this.client.query(query);
            return { recordset: [{ count: rows[0]?.count ?? 0 }] };
        } catch (err) {
            console.log(err);
            return { recordset: [{ count: 0 }] };
        }
    }

    /** Esquemas del datalake presentes en AOC_AMBITOS_MAP, ya traducidos a su nombre legible */
    async listAmbitos(): Promise<AocAmbito[]> {
        this.client = await this.getclient();
        try {
            const schemas = await this.execQuery('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA');
            const names = schemas.map((s: any) => s['SCHEMA_NAME']);
            console.log('[AOC] Esquemas detectados en el datalake:', names);
            return names
                .filter((name: string) => !!AOC_AMBITOS_MAP[name])
                .map((name: string) => ({ technicalName: name, label: AOC_AMBITOS_MAP[name] }));
        } finally {
            await this.client.close();
        }
    }
}
