import { SQLserverConnection } from '../../services/connection/db-systems/slqserver-connection';
import { AOC_AMBITOS_MAP } from './aoc-ambitos.map';

export interface AocAmbito {
    technicalName: string;
    label: string;
}

/**
 * Conector AOC: es un SQL Server estándar por debajo (misma generateDataModel/query builder
 * heredadas), solo añade el descubrimiento de ámbitos (esquemas) traducidos por AOC_AMBITOS_MAP.
 */
export class AOCConnection extends SQLserverConnection {

    /** Esquemas del datalake presentes en AOC_AMBITOS_MAP, ya traducidos a su nombre legible */
    async listAmbitos(): Promise<AocAmbito[]> {
        this.client = await this.getclient();
        try {
            const schemas = await this.execQuery('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA');
            return schemas
                .map((s: any) => s['SCHEMA_NAME'])
                .filter((name: string) => !!AOC_AMBITOS_MAP[name])
                .map((name: string) => ({ technicalName: name, label: AOC_AMBITOS_MAP[name] }));
        } finally {
            this.client.close();
        }
    }
}
