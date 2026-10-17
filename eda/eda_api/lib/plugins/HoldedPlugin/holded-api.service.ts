import * as path from 'path';
import * as fs from 'fs';

// Holded API v2 — https://www.holded.com/developers/getting-started
// Bearer auth, cursor pagination ({ items, cursor, has_more }), snake_case fields
const HOLDED_API = 'https://api.holded.com/api/v2';
const PAGE_LIMIT = 200; // max allowed by v2 list endpoints
const MAX_RETRIES = 3;
const LEDGER_DEFAULT_START_DATE = '2000-01-01'; // /ledger-entries requires a date range: used when no dateFrom is given

export interface HoldedDownloadParams {
    apiKey: string;
    dateFrom?: string; // YYYY-MM-DD
    dateTo?: string;   // YYYY-MM-DD
}

export interface HoldedDownloadResult {
    invoices: number;
    lines: number;
    contacts: number;
    products: number;
    ledgerEntries: number;
}

export class HoldedApiService {

    private static headers(apiKey: string): Record<string, string> {
        return {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
        };
    }

    /**
     * GET with retry on 429/5xx (honours Retry-After). Throws with Holded's
     * response body on any other error so the cause is visible in the log.
     */
    private static async get(apiKey: string, endpoint: string, query: Record<string, string> = {}): Promise<any> {
        const qs = new URLSearchParams(query).toString();
        const url = `${HOLDED_API}${endpoint}${qs ? '?' + qs : ''}`;

        for (let attempt = 0; ; attempt++) {
            const res = await fetch(url, { headers: HoldedApiService.headers(apiKey) });
            const body = await res.text();

            if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
                const retryAfter = Number(res.headers.get('retry-after')) || 2 ** attempt;
                console.warn(`[Holded] HTTP ${res.status} en ${endpoint}, reintento en ${retryAfter}s`);
                await new Promise(r => setTimeout(r, retryAfter * 1000));
                continue;
            }
            if (!res.ok) {
                throw new Error(`HTTP ${res.status} en ${endpoint}: ${body.slice(0, 300)}`);
            }
            // Holded returns an HTML page (HTTP 200) for unknown routes
            if (!(res.headers.get('content-type') || '').includes('json')) {
                throw new Error(`Respuesta no JSON de Holded en ${endpoint}: ${body.slice(0, 120)}`);
            }
            return JSON.parse(body);
        }
    }

    static async testApiKey(apiKey: string): Promise<void> {
        const data = await HoldedApiService.get(apiKey, '/contacts', { limit: '1' });
        if (!Array.isArray(data?.items)) {
            throw new Error(`Error de autenticación en Holded: ${JSON.stringify(data).slice(0, 200)}`);
        }
    }

    private static async fetchAllPages<T>(apiKey: string, endpoint: string, query: Record<string, string> = {}): Promise<T[]> {
        const results: T[] = [];
        let cursor: string | null = null;
        do {
            const data = await HoldedApiService.get(apiKey, endpoint, {
                ...query,
                limit: String(PAGE_LIMIT),
                ...(cursor ? { cursor } : {})
            });
            if (!Array.isArray(data?.items)) {
                throw new Error(`Respuesta inesperada de Holded en ${endpoint}: ${JSON.stringify(data).slice(0, 200)}`);
            }
            results.push(...data.items);
            cursor = data.has_more ? data.cursor : null;
        } while (cursor);
        return results;
    }

    private static toCsvRow(values: any[]): string {
        return values.map(v => {
            if (v === null || v === undefined) return '';
            const str = String(v).replace(/"/g, '""');
            return `"${str}"`;
        }).join(',');
    }

    private static writeCsv(filePath: string, headers: string[], rows: any[][]): void {
        const lines = [
            headers.join(','),
            ...rows.map(r => HoldedApiService.toCsvRow(r))
        ];
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    }

    /**
     * Numeric value of an amount. v2 may return amounts as localized strings ("1.234,56"):
     * when there is a comma it is the decimal separator and dots are thousands separators.
     */
    private static num(value: any): number {
        if (typeof value === 'number') return value;
        if (value === null || value === undefined) return 0;
        let str = String(value).trim().replace(/[^\d,.\-]/g, '');
        if (str.includes(',')) {
            str = str.replace(/\./g, '').replace(',', '.');
        }
        const n = Number(str);
        return isNaN(n) ? 0 : n;
    }

    /**
     * Tax percentage of an invoice line. v2 returns `tax: "0"` and the applied taxes as
     * codes in `taxes` (e.g. "s_iva_21"), so the VAT percentage is read from the code.
     */
    private static lineTaxPct(line: any): number {
        const tax = HoldedApiService.num(line.tax);
        if (tax) return tax;
        if (!Array.isArray(line.taxes)) return 0;
        return line.taxes.reduce((sum: number, code: any) => {
            const match = /iva_(\d+(?:[.,]\d+)?)$/i.exec(String(code));
            return sum + (match ? HoldedApiService.num(match[1]) : 0);
        }, 0);
    }

    /** Date as YYYY-MM-DD: ledger entries come as DD/MM/YYYY, other endpoints already in ISO */
    private static isoDate(value: any): string {
        if (!value) return '';
        const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value).trim());
        return match ? `${match[3]}-${match[2]}-${match[1]}` : String(value);
    }

    /** Arrays of tags/taxes are flattened to a comma-separated string */
    private static joinList(list: any): string {
        if (!Array.isArray(list)) return '';
        return list.map(x => typeof x === 'object' ? (x?.name ?? x?.id ?? JSON.stringify(x)) : x).join(',');
    }

    static async downloadToFolder(params: HoldedDownloadParams, folderPath: string): Promise<HoldedDownloadResult> {
        const { apiKey, dateFrom, dateTo } = params;
        const dateQuery: Record<string, string> = {};
        if (dateFrom) dateQuery['start_date'] = dateFrom;
        if (dateTo)   dateQuery['end_date']   = dateTo;

        console.log(`[Holded] Starting download → ${folderPath}`);

        // 1. Contacts
        const contacts = await HoldedApiService.fetchAllPages<any>(apiKey, '/contacts');
        console.log(`[Holded] contacts: ${contacts.length}`);

        // 2. Products
        const products = await HoldedApiService.fetchAllPages<any>(apiKey, '/products');
        console.log(`[Holded] products: ${products.length}`);

        // 3. Invoices — v2 includes the line items in `lines`, no detail fetch needed
        const invoices = await HoldedApiService.fetchAllPages<any>(apiKey, '/invoices', dateQuery);
        console.log(`[Holded] invoices: ${invoices.length}`);

        const allLines: any[] = [];
        for (const inv of invoices) {
            (inv.lines || []).forEach((line: any, idx: number) => {
                // Blank lines left in the invoice (no name, description, product or price) carry no data
                const isBlank = !line.name && !line.description && !line.product_id && !HoldedApiService.num(line.price);
                if (!isBlank) {
                    allLines.push({ ...line, invoice_id: inv.id, _lineIdx: idx });
                }
            });
        }
        console.log(`[Holded] invoice lines: ${allLines.length}`);

        // 4. Accounting — ledger entries + chart of accounts for the names (best effort:
        //    the API key may not have the accounting permissions)
        let ledgerEntries: any[] = [];
        const accountNames = new Map<string, string>();
        try {
            // Unlike the other endpoints, start_date and end_date are mandatory here
            const ledgerQuery = {
                start_date: dateFrom || LEDGER_DEFAULT_START_DATE,
                end_date:   dateTo   || new Date().toISOString().slice(0, 10)
            };
            ledgerEntries = await HoldedApiService.fetchAllPages<any>(apiKey, '/ledger-entries', ledgerQuery);
            const accounts = await HoldedApiService.fetchAllPages<any>(apiKey, '/accounting-accounts');
            accounts.forEach((a: any) => accountNames.set(String(a.number), a.name));
        } catch (e: any) {
            console.warn('[Holded] Error descargando asientos contables:', e.message);
        }
        console.log(`[Holded] ledger entries: ${ledgerEntries.length}`);

        // Ensure folder exists
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        // invoices.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'invoices.csv'),
            ['id', 'number', 'date', 'due_date', 'contact_id', 'contact', 'description',
             'currency', 'subtotal', 'discount', 'taxes', 'total', 'status', 'paid', 'pending'],
            invoices.map((inv: any) => [
                inv.id, inv.document_number || '',
                inv.date || '', inv.due_date || '',
                inv.contact_id || '', inv.contact_name || '', inv.description || '',
                inv.currency || 'EUR',
                HoldedApiService.num(inv.subtotal), HoldedApiService.num(inv.discount),
                HoldedApiService.num(inv.tax), HoldedApiService.num(inv.total),
                inv.status || '', HoldedApiService.num(inv.payments_total), HoldedApiService.num(inv.payments_pending)
            ])
        );

        // invoice_lines.csv — v2 doesn't return line amounts, they are computed
        // from price × units with the line discount, tax and retention (IRPF) percentages
        HoldedApiService.writeCsv(path.join(folderPath, 'invoice_lines.csv'),
            ['id', 'invoice_id', 'product_id', 'name', 'description', 'sku', 'quantity',
             'unit_price', 'discount', 'subtotal', 'total', 'tax_pct', 'account',
             'retention_pct', 'retention'],
            allLines.map((line: any) => {
                const units        = HoldedApiService.num(line.units);
                const price        = HoldedApiService.num(line.price);
                const discount     = HoldedApiService.num(line.discount);
                const taxPct       = HoldedApiService.lineTaxPct(line);
                const retentionPct = HoldedApiService.num(line.retention);
                const subtotal     = +(price * units * (1 - discount / 100)).toFixed(2);
                const taxAmount    = +(subtotal * taxPct / 100).toFixed(2);
                const retention    = +(subtotal * retentionPct / 100).toFixed(2);
                const total        = +(subtotal + taxAmount - retention).toFixed(2);
                return [
                    line.line_id || `${line.invoice_id}_${line._lineIdx}`,
                    line.invoice_id, line.product_id || '',
                    line.name || '', line.description || '', line.sku || '',
                    units, price, discount, subtotal, total, taxPct,
                    line.account || '',
                    retentionPct, retention
                ];
            })
        );

        // contacts.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'contacts.csv'),
            ['id', 'code', 'name', 'trade_name', 'email', 'phone', 'mobile', 'type', 'vat', 'country'],
            contacts.map((c: any) => [
                c.id, c.code || '', c.name || '', c.trade_name || '',
                c.email || '', c.phone || '', c.mobile || '',
                c.type || '', c.vat_number || '',
                c.bill_address?.country || c.bill_address?.country_code || ''
            ])
        );

        // products.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'products.csv'),
            ['id', 'name', 'description', 'price', 'cost', 'tax_codes', 'type', 'sku', 'category_id', 'stock'],
            products.map((p: any) => [
                p.id, p.name || '', p.description || '',
                HoldedApiService.num(p.price), HoldedApiService.num(p.cost), HoldedApiService.joinList(p.taxes),
                p.kind || '', p.sku || p.barcode || '',
                p.category_id || '', HoldedApiService.num(p.stock)
            ])
        );

        // ledger.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'ledger.csv'),
            ['id', 'entry_number', 'line', 'date', 'type', 'account', 'account_name',
             'description', 'doc_description', 'debit', 'credit'],
            ledgerEntries.map((e: any) => [
                e.id, e.entry_number ?? '', e.line ?? '',
                HoldedApiService.isoDate(e.date), e.type || '',
                e.account ?? '', accountNames.get(String(e.account)) || '',
                e.description || '', e.doc_description || '',
                HoldedApiService.num(e.debit), HoldedApiService.num(e.credit)
            ])
        );

        console.log(`[Holded] 5 CSV files written to ${folderPath}`);

        return {
            invoices: invoices.length,
            lines: allLines.length,
            contacts: contacts.length,
            products: products.length,
            ledgerEntries: ledgerEntries.length
        };
    }
}
