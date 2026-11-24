import { SQLserverConnection } from '../../services/connection/db-systems/slqserver-connection';
import { AOC_AMBITOS_MAP } from './aoc-ambitos.map';
import { AOC_TABLES_MAP } from './aoc-tables.map';
import { AOC_ODBC_DRIVER } from './aoc-driver.check';
// 'odbc' is loaded lazily: requiring it at module load crashes the API when unixODBC is missing
import { getOdbc } from './aoc-odbc.loader';

export interface AocAmbito {
    technicalName: string;
    label: string;
}

/** Envuelve un valor para un connection string ODBC: entre llaves, escapando '}' literales */
function odbcQuote(value: string): string {
    return `{${String(value).replace(/}/g, '}}')}}`;
}

/**
 * Returns the query with every non-ASCII character inside a string literal rewritten as an
 * NCHAR(<code>) concatenation, e.g. 'BAIX PENEDÈS' -> N'BAIX PENED' + NCHAR(200) + N'S'.
 *
 * Needed off Windows: there the 'odbc' package is built without UNICODE, so the SQL text reaches the
 * driver as narrow (8-bit) text, which ODBC Driver 18 decodes with the process C locale. Node never
 * calls setlocale(), so that locale is "C" (ASCII) whatever LANG says, the UTF-8 bytes of an accented
 * literal are mangled and filters such as IN ('BAIX PENEDÈS, EL') silently match nothing.
 * Pure-ASCII SQL is immune to that. Identifiers ("double quoted") are left untouched: results are
 * mapped by column position, so a mangled alias does not affect them.
 */
export function asciiSafeSql(query: string): string {
    if (!/[^\x00-\x7F]/.test(query)) return query;
    let out = '';
    let i = 0;
    while (i < query.length) {
        const ch = query[i];
        if (ch !== "'") { out += ch; i++; continue; }
        // Read the whole literal, honouring '' as an escaped quote
        let j = i + 1;
        let body = '';
        while (j < query.length) {
            if (query[j] === "'" && query[j + 1] === "'") { body += "''"; j += 2; continue; }
            if (query[j] === "'") break;
            body += query[j++];
        }
        const closed = j < query.length;
        if (!closed || !/[^\x00-\x7F]/.test(body)) {
            out += query.slice(i, closed ? j + 1 : j);
        } else {
            // Prefixing N keeps the literal as nvarchar; drop a previous N prefix to avoid NN'...'
            if (/[Nn]$/.test(out) && !/[A-Za-z0-9_]$/.test(out.slice(0, -1))) out = out.slice(0, -1);
            const parts: string[] = [];
            let chunk = '';
            // UTF-16 code units: characters outside the BMP become a surrogate pair of NCHARs
            for (let k = 0; k < body.length; k++) {
                const code = body.charCodeAt(k);
                if (code < 0x80) { chunk += body[k]; continue; }
                if (chunk) { parts.push(`N'${chunk}'`); chunk = ''; }
                parts.push(`NCHAR(${code})`);
            }
            if (chunk) parts.push(`N'${chunk}'`);
            out += `(${parts.join(' + ')})`;
        }
        i = closed ? j + 1 : j;
    }
    return out;
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
            `Driver={${AOC_ODBC_DRIVER}};` +
            `Server=${this.config.host},${this.config.port};` +
            `Database=${this.config.database};` +
            `Authentication=ActiveDirectoryServicePrincipal;` +
            `UID=${odbcQuote(this.config.user)};` +
            `PWD=${odbcQuote(this.config.password)};` +
            `Encrypt=yes;TrustServerCertificate=no;` +
            // The datalake stores varchar as UTF-8 (Latin1_General_100_BIN2_UTF8). On Windows the driver
            // translates it to the ANSI code page, which the 'odbc' package then decodes as UTF-8, so
            // accents become U+FFFD ("VALLÈS" -> "VALL�S"). Disabling the translation returns the raw
            // UTF-8 bytes. Off Windows, accented literals in the SQL text are handled by asciiSafeSql().
            (process.platform === 'win32' ? 'AutoTranslate=no;' : '');

        return getOdbc().connect(connectionString);
    }

    async execQuery(query: string): Promise<any> {
        // On Windows the SQL text is sent as UTF-16 (the 'odbc' package is built with UNICODE)
        return this.client.query(process.platform === 'win32' ? query : asciiSafeSql(query));
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

    /** Igual que SQLserverConnection.generateDataModel, pero aplicando los nombres legibles de AOC_TABLES_MAP */
    async generateDataModel(optimize: number, filter: string): Promise<any> {
        const tables = await super.generateDataModel(optimize, filter);
        return tables.map((table: any) => this.applyAocLabels(table));
    }

    private applyAocLabels(table: any): any {
        const mapping = AOC_TABLES_MAP[table.table_name];

        if (mapping?.label) {
            table.display_name = { default: mapping.label, localized: [] };
            table.description = { default: mapping.label, localized: [] };
        }

        table.columns.forEach((column: any) => {
            const label = mapping?.columns?.[column.column_name];
            if (label) {
                column.display_name = { default: label, localized: [] };
                column.description = { default: label, localized: [] };
            }
        });

        return table;
    }

    /** Esquemas del datalake presentes en AOC_AMBITOS_MAP, ya traducidos a su nombre legible */
    async listAmbitos(): Promise<AocAmbito[]> {
        this.client = await this.getclient();
        try {
            const schemas = await this.execQuery('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA');
            const names = schemas.map((s: any) => s['SCHEMA_NAME']);
            // console.log('[AOC] Esquemas detectados en el datalake:', names);
            return names
                .filter((name: string) => !!AOC_AMBITOS_MAP[name])
                .map((name: string) => ({ technicalName: name, label: AOC_AMBITOS_MAP[name] }));
        } finally {
            await this.client.close();
        }
    }
}
