import * as path from 'path';
import * as fs from 'fs';

export interface OdooDownloadParams {
    url: string;
    db: string;
    username: string;
    password: string;
    dateFrom?: string;
    dateTo?: string;
    invoiceTypes?: string[];
}

export interface OdooDownloadResult {
    invoices: number;
    lines: number;
    partners: number;
    products: number;
    users: number;
}

export class OdooApiService {

    static async authenticate(baseUrl: string, db: string, username: string, password: string): Promise<string> {
        const response = await fetch(`${baseUrl}/web/session/authenticate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                id: 1,
                params: { db, login: username, password }
            })
        });

        const data = await response.json() as any;

        if (data.error || !data.result?.uid) {
            const msg = data.error?.data?.message || data.error?.message || 'Credenciales inválidas';
            throw new Error(`Autenticación fallida en Odoo: ${msg}`);
        }

        const setCookie = response.headers.get('set-cookie') || '';
        const sessionMatch = setCookie.match(/session_id=([^;,\s]+)/);
        return sessionMatch ? sessionMatch[1] : (data.result.session_id || '');
    }

    static async callKw(
        baseUrl: string,
        sessionId: string,
        model: string,
        method: string,
        args: any[],
        kwargs: Record<string, any> = {}
    ): Promise<any> {
        const response = await fetch(`${baseUrl}/web/dataset/call_kw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `session_id=${sessionId}`
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'call',
                id: Math.floor(Math.random() * 9999) + 1,
                params: {
                    model,
                    method,
                    args,
                    kwargs: { context: {}, ...kwargs }
                }
            })
        });

        const data = await response.json() as any;

        if (data.error) {
            throw new Error(data.error?.data?.message || data.error?.message || 'Error en la API de Odoo');
        }

        return data.result;
    }

    static async fetchByIds(
        baseUrl: string,
        sessionId: string,
        model: string,
        ids: number[],
        fields: string[],
        batchSize = 500
    ): Promise<any[]> {
        const results: any[] = [];
        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = await OdooApiService.callKw(
                baseUrl, sessionId,
                model, 'search_read',
                [[['id', 'in', ids.slice(i, i + batchSize)]]],
                { fields, limit: 0 }
            );
            results.push(...(batch || []));
        }
        return results;
    }

    static resolveMany2one(field: any): [number | '', string] {
        if (Array.isArray(field) && field.length === 2) return [field[0], String(field[1])];
        return ['', ''];
    }

    static toCsvRow(values: any[]): string {
        return values.map(v => {
            if (v === null || v === undefined || v === false) return '';
            const str = String(v).replace(/"/g, '""');
            return `"${str}"`;
        }).join(',');
    }

    static writeCsv(filePath: string, headers: string[], rows: any[][]): void {
        const lines = [
            headers.join(','),
            ...rows.map(r => OdooApiService.toCsvRow(r))
        ];
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    }

    static uniqueIds(records: any[], getField: (r: any) => any): number[] {
        return [
            ...new Set(
                records
                    .map(r => { const v = getField(r); return Array.isArray(v) ? v[0] : null; })
                    .filter((id): id is number => id !== null)
            )
        ];
    }

    static async downloadToFolder(params: OdooDownloadParams, folderPath: string): Promise<OdooDownloadResult> {
        const { url, db, username, password, dateFrom, dateTo, invoiceTypes } = params;
        const baseUrl = url.replace(/\/$/, '');
        const types = invoiceTypes || ['out_invoice', 'in_invoice', 'out_refund', 'in_refund'];

        console.log(`[Odoo] Connecting to ${baseUrl} (db: ${db})`);
        const sessionId = await OdooApiService.authenticate(baseUrl, db, username, password);
        if (!sessionId) throw new Error('Could not obtain Odoo session');
        console.log(`[Odoo] Authentication successful`);

        // 1. Facturas
        const domain: any[] = [['move_type', 'in', types], ['state', '=', 'posted']];
        if (dateFrom) domain.push(['invoice_date', '>=', dateFrom]);
        if (dateTo)   domain.push(['invoice_date', '<=', dateTo]);

        const BATCH = 200;
        let offset = 0;
        const allInvoices: any[] = [];
        while (true) {
            const batch = await OdooApiService.callKw(baseUrl, sessionId, 'account.move', 'search_read', [domain], {
                fields: ['id', 'name', 'invoice_date', 'invoice_date_due', 'partner_id', 'invoice_user_id',
                         'amount_untaxed', 'amount_tax', 'amount_total', 'state', 'move_type', 'ref',
                         'currency_id', 'journal_id', 'company_id'],
                limit: BATCH, offset
            });
            if (!batch || batch.length === 0) break;
            allInvoices.push(...batch);
            if (batch.length < BATCH) break;
            offset += BATCH;
        }
        console.log(`[Odoo] invoices: ${allInvoices.length}`);

        // 2. Líneas
        const invoiceIds = allInvoices.map((inv: any) => inv.id);
        const allLines: any[] = [];
        for (let i = 0; i < invoiceIds.length; i += 500) {
            const lines = await OdooApiService.callKw(baseUrl, sessionId, 'account.move.line', 'search_read',
                [[['move_id', 'in', invoiceIds.slice(i, i + 500)], ['display_type', 'not in', ['line_section', 'line_note']]]],
                { fields: ['id', 'move_id', 'product_id', 'name', 'quantity', 'price_unit', 'price_subtotal', 'price_total', 'account_id', 'sequence'], limit: 0 }
            );
            allLines.push(...(lines || []));
        }
        console.log(`[Odoo] invoice lines: ${allLines.length}`);

        // 3. Clientes
        const partnerIds = OdooApiService.uniqueIds(allInvoices, inv => inv.partner_id);
        const allPartners = await OdooApiService.fetchByIds(baseUrl, sessionId, 'res.partner', partnerIds,
            ['id', 'name', 'email', 'phone', 'mobile', 'street', 'street2', 'city', 'zip',
             'country_id', 'state_id', 'vat', 'ref', 'parent_id', 'is_company', 'customer_rank', 'supplier_rank']);
        console.log(`[Odoo] partners: ${allPartners.length}`);

        // 4. Productos
        const productIds = OdooApiService.uniqueIds(allLines, l => l.product_id);
        const allProducts = await OdooApiService.fetchByIds(baseUrl, sessionId, 'product.product', productIds,
            ['id', 'name', 'description_sale', 'list_price', 'standard_price', 'type', 'categ_id',
             'uom_id', 'default_code', 'barcode', 'active', 'product_tmpl_id']);
        console.log(`[Odoo] products: ${allProducts.length}`);

        // 5. Vendedores
        const userIds = OdooApiService.uniqueIds(allInvoices, inv => inv.invoice_user_id);
        const allUsers = await OdooApiService.fetchByIds(baseUrl, sessionId, 'res.users', userIds,
            ['id', 'name', 'login', 'email', 'active', 'share']);
        console.log(`[Odoo] users: ${allUsers.length}`);

        // Ensure folder exists
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const invoiceMap = new Map<number, any>(allInvoices.map((inv: any) => [inv.id, inv]));

        // invoices.csv
        OdooApiService.writeCsv(path.join(folderPath, 'invoices.csv'),
            ['id', 'number', 'invoice_date', 'due_date', 'partner_id', 'partner',
             'salesperson_id', 'salesperson', 'type', 'status', 'tax_base', 'taxes', 'total',
             'currency', 'journal', 'company', 'reference'],
            allInvoices.map((inv: any) => {
                const [partnerId, partnerName]         = OdooApiService.resolveMany2one(inv.partner_id);
                const [salespersonId, salespersonName] = OdooApiService.resolveMany2one(inv.invoice_user_id);
                const [, currency] = OdooApiService.resolveMany2one(inv.currency_id);
                const [, journal]  = OdooApiService.resolveMany2one(inv.journal_id);
                const [, company]  = OdooApiService.resolveMany2one(inv.company_id);
                return [inv.id, inv.name, inv.invoice_date || '', inv.invoice_date_due || '',
                        partnerId, partnerName, salespersonId, salespersonName,
                        inv.move_type, inv.state, inv.amount_untaxed, inv.amount_tax, inv.amount_total,
                        currency, journal, company, inv.ref || ''];
            })
        );

        // invoice_lines.csv
        OdooApiService.writeCsv(path.join(folderPath, 'invoice_lines.csv'),
            ['id', 'invoice_id', 'invoice_number', 'product_id', 'product', 'description',
             'quantity', 'unit_price', 'subtotal', 'total_with_taxes', 'account_id', 'account', 'sequence'],
            allLines.map((line: any) => {
                const moveId = Array.isArray(line.move_id) ? line.move_id[0] : line.move_id;
                const inv = invoiceMap.get(moveId);
                const [productId, productName] = OdooApiService.resolveMany2one(line.product_id);
                const [accountId, accountName] = OdooApiService.resolveMany2one(line.account_id);
                return [line.id, moveId, inv ? inv.name : '', productId, productName, line.name || '',
                        line.quantity, line.price_unit, line.price_subtotal, line.price_total,
                        accountId, accountName, line.sequence];
            })
        );

        // partners.csv
        OdooApiService.writeCsv(path.join(folderPath, 'partners.csv'),
            ['id', 'name', 'email', 'phone', 'mobile', 'street', 'street2', 'city',
             'zip', 'country_id', 'country', 'state_id', 'state', 'vat',
             'internal_ref', 'company_id', 'company', 'is_company', 'is_customer', 'is_supplier'],
            allPartners.map((p: any) => {
                const [countryId, countryName]   = OdooApiService.resolveMany2one(p.country_id);
                const [stateId, stateName]       = OdooApiService.resolveMany2one(p.state_id);
                const [companyId, companyName]   = OdooApiService.resolveMany2one(p.parent_id);
                return [p.id, p.name, p.email || '', p.phone || '', p.mobile || '',
                        p.street || '', p.street2 || '', p.city || '', p.zip || '',
                        countryId, countryName, stateId, stateName,
                        p.vat || '', p.ref || '', companyId, companyName,
                        p.is_company ? 1 : 0, p.customer_rank || 0, p.supplier_rank || 0];
            })
        );

        // products.csv
        OdooApiService.writeCsv(path.join(folderPath, 'products.csv'),
            ['id', 'name', 'sale_description', 'sale_price', 'cost_price', 'type',
             'category_id', 'category', 'uom_id', 'uom',
             'internal_ref', 'barcode', 'active', 'template_id'],
            allProducts.map((p: any) => {
                const [categId, categName] = OdooApiService.resolveMany2one(p.categ_id);
                const [uomId, uomName]     = OdooApiService.resolveMany2one(p.uom_id);
                const [tmplId]             = OdooApiService.resolveMany2one(p.product_tmpl_id);
                return [p.id, p.name, p.description_sale || '', p.list_price, p.standard_price,
                        p.type, categId, categName, uomId, uomName,
                        p.default_code || '', p.barcode || '', p.active ? 1 : 0, tmplId];
            })
        );

        // users.csv
        OdooApiService.writeCsv(path.join(folderPath, 'users.csv'),
            ['id', 'name', 'login', 'email', 'active', 'external_user'],
            allUsers.map((u: any) => [u.id, u.name, u.login, u.email || '', u.active ? 1 : 0, u.share ? 1 : 0])
        );

        console.log(`[Odoo] 5 files written to ${folderPath}`);

        return {
            invoices: allInvoices.length,
            lines:    allLines.length,
            partners: allPartners.length,
            products: allProducts.length,
            users:    allUsers.length
        };
    }
}
