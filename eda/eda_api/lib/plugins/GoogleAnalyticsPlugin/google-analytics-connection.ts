import * as path from 'path';
import { DuckDBConnection } from '../../services/connection/db-systems/duckdb-connection';
import { GA4ApiService } from './ga4-api.service';

export class GoogleAnalyticsConnection extends DuckDBConnection {

    async tryConnection(): Promise<any> {
        const { host, password } = this.config;
        const propertyId = host;
        await GA4ApiService.downloadToFolder(
            { propertyId, credentialsJson: password, dateFrom: 'yesterday', dateTo: 'today' },
            path.join(process.cwd(), 'duckdb', this.config.database)
        );
        this.itsConnected();
    }

    async generateDataModel(optimize: number, filter: string): Promise<any> {
        const { host, database, password } = this.config;
        const folderPath = path.join(process.cwd(), 'duckdb', database);

        await GA4ApiService.downloadToFolder(
            { propertyId: host, credentialsJson: password },
            folderPath
        );

        return super.generateDataModel(optimize, filter);
    }
}
