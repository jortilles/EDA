import * as path from 'path';
import { DuckDBConnection } from '../../services/connection/db-systems/duckdb-connection';
import { OdooApiService } from './odoo-api.service';

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

        // 1. Download all data from Odoo
        await OdooApiService.downloadToFolder(
            { url: baseUrl, db: database, username: user, password },
            folderPath
        );
        await OdooApiService.downloadOrdersToFolder(
            { url: baseUrl, db: database, username: user, password },
            folderPath
        );


        const dataModel: any[] = await super.generateDataModel(optimize, filter);

        const tableNames = new Set(dataModel.map((t: any) => t.table_name));
        const redirectTargets = ['invoices', 'orders'].filter(t => tableNames.has(t));

        // Explicit Odoo FK relations: setRelations can't detect these because the PK
        // column in the target table is named "id", not "product_id" / "partner_id" / etc.
        const odooRelations: Array<{ sourceTable: string; sourceCol: string; targetTable: string; targetCol: string }> = [
            { sourceTable: 'invoices', sourceCol: 'product_id',    targetTable: 'products', targetCol: 'id' },
            { sourceTable: 'invoices', sourceCol: 'partner_id',    targetTable: 'partners', targetCol: 'id' },
            { sourceTable: 'invoices', sourceCol: 'salesperson_id',targetTable: 'users',    targetCol: 'id' },
            { sourceTable: 'orders',   sourceCol: 'product_id',    targetTable: 'products', targetCol: 'id' },
            { sourceTable: 'orders',   sourceCol: 'partner_id',    targetTable: 'partners', targetCol: 'id' },
            { sourceTable: 'orders',   sourceCol: 'salesperson_id',targetTable: 'users',    targetCol: 'id' },
        ];

        // Remove invoice_lines table; redirect its relations to invoices and orders;
        // inject explicit Odoo relations
        const isInvoicesOrdersLink = (r: any) =>
            (r.source_table === 'invoices' && r.target_table === 'orders') ||
            (r.source_table === 'orders'   && r.target_table === 'invoices');

        return dataModel
            .filter((t: any) => t.table_name !== 'invoice_lines')
            .map((t: any) => {
                const redirected: any[] = [];
                for (const r of t.relations) {
                    if (r.source_table === 'invoice_lines' || r.target_table === 'invoice_lines') {
                        for (const redirect of redirectTargets) {
                            const rr = {
                                ...r,
                                source_table: r.source_table === 'invoice_lines' ? redirect : r.source_table,
                                target_table: r.target_table === 'invoice_lines' ? redirect : r.target_table,
                            };
                            if (!isInvoicesOrdersLink(rr)) redirected.push(rr);
                        }
                    } else if (!isInvoicesOrdersLink(r)) {
                        redirected.push(r);
                    }
                }

                // Add explicit relations for this table (both directions)
                for (const rel of odooRelations) {
                    if (!tableNames.has(rel.sourceTable) || !tableNames.has(rel.targetTable)) continue;
                    if (t.table_name === rel.sourceTable) {
                        redirected.push({ source_table: rel.sourceTable, source_column: [rel.sourceCol], target_table: rel.targetTable, target_column: [rel.targetCol], visible: true });
                    }
                    if (t.table_name === rel.targetTable) {
                        redirected.push({ source_table: rel.targetTable, source_column: [rel.targetCol], target_table: rel.sourceTable, target_column: [rel.sourceCol], visible: true });
                    }
                }

                return { ...t, relations: redirected };
            });
    }
}
