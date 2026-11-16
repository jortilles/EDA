import * as path from 'path';
import { DuckDBConnection } from '../../services/connection/db-systems/duckdb-connection';
import { ShopifyApiService } from './shopify-api.service';

export class ShopifyConnection extends DuckDBConnection {

    async tryConnection(): Promise<any> {
        const { host, password } = this.config;
        await ShopifyApiService.testConnection(host, password);
        this.itsConnected();
    }

    async generateDataModel(optimize: number, filter: string): Promise<any> {
        const { host, database, password } = this.config;
        const folderPath = path.join(process.cwd(), 'duckdb', database);
        await ShopifyApiService.downloadToFolder({ shop: host, accessToken: password }, folderPath);
        return super.generateDataModel(optimize, filter);
    }
}
