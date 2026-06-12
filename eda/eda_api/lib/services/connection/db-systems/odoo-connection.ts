import * as path from 'path';
import { DuckDBConnection } from './duckdb-connection';
import { OdooApiService } from '../../odoo/odoo-api.service';

export class OdooConnection extends DuckDBConnection {

    // getCsvFolder() is inherited from DuckDBConnection and uses config.database,
    // which for Odoo datasources stores the Odoo DB name (= the folder name under duckdb/).

    async tryConnection(): Promise<any> {
        const { host, database, user, password } = this.config;
        const baseUrl = (host || '').replace(/\/$/, '');
        await OdooApiService.authenticate(baseUrl, database, user, password);
        this.itsConnected();
    }

    async generateDataModel(optimize: number, filter: string): Promise<any> {
        const { host, database, user, password } = this.config;
        const baseUrl = (host || '').replace(/\/$/, '');
        const folderPath = path.join(process.cwd(), 'duckdb', database);

        await OdooApiService.downloadToFolder(
            { url: baseUrl, db: database, username: user, password },
            folderPath
        );

        return super.generateDataModel(optimize, filter);
    }
}
