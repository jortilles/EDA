import * as path from 'path';
import { DuckDBConnection } from './duckdb-connection';
import { HoldedApiService } from '../../holded/holded-api.service';

export class HoldedConnection extends DuckDBConnection {

    // getCsvFolder() is inherited: uses config.database as the folder name under duckdb/

    async tryConnection(): Promise<any> {
        const { password } = this.config;
        await HoldedApiService.testApiKey(password);
        this.itsConnected();
    }

    async generateDataModel(optimize: number, filter: string): Promise<any> {
        const { database, password } = this.config;
        const folderPath = path.join(process.cwd(), 'duckdb', database);
        await HoldedApiService.downloadToFolder({ apiKey: password }, folderPath);
        return super.generateDataModel(optimize, filter);
    }
}
