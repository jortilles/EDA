import * as path from 'path';
import * as fs from 'fs';

const HOLDED_API = 'https://api.holded.com/api';

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
            'key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    static async testApiKey(apiKey: string): Promise<void> {
        const res = await fetch(`${HOLDED_API}/contacts/v1/contacts?page=1`, {
            headers: HoldedApiService.headers(apiKey)
        });
        if (!res.ok) {
            throw new Error(`API Key de Holded inválida (HTTP ${res.status})`);
        }
        const data = await res.json() as any;
        if (data?.error) {
            throw new Error(`Error de autenticación en Holded: ${data.error?.message || JSON.stringify(data.error)}`);
        }
    }

    private static async fetchAllPages<T>(apiKey: string, endpoint: string): Promise<T[]> {
        const results: T[] = [];
        let page = 1;
        while (true) {
            const res = await fetch(`${HOLDED_API}${endpoint}?page=${page}`, {
                headers: HoldedApiService.headers(apiKey)
            });
            if (!res.ok) {
                console.warn(`[Holded] HTTP ${res.status} en ${endpoint} página ${page}`);
                break;
            }
            const data = await res.json() as any;
            if (!Array.isArray(data) || data.length === 0) break;
            results.push(...data);
            if (data.length < 500) break; // Holded returns max 500 per page
            page++;
        }
        return results;
    }

    private static async fetchInvoiceDetail(apiKey: string, invoiceId: string): Promise<any> {
        const res = await fetch(`${HOLDED_API}/invoicing/v1/documents/invoice/${invoiceId}`, {
            headers: HoldedApiService.headers(apiKey)
        });
        if (!res.ok) return null;
        return res.json();
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

    private static formatDate(timestamp: number | null | undefined): string {
        if (!timestamp) return '';
        return new Date(timestamp * 1000).toISOString().split('T')[0];
    }

    static async downloadToFolder(params: HoldedDownloadParams, folderPath: string): Promise<HoldedDownloadResult> {
        const { apiKey, dateFrom, dateTo } = params;

        console.log(`[Holded] Starting download → ${folderPath}`);

        // 1. Contacts
        const contacts = await HoldedApiService.fetchAllPages<any>(apiKey, '/contacts/v1/contacts');
        console.log(`[Holded] contacts: ${contacts.length}`);

        // 2. Products
        const products = await HoldedApiService.fetchAllPages<any>(apiKey, '/products/v1/products');
        console.log(`[Holded] products: ${products.length}`);

        // 3. Invoice list
        const invoices = await HoldedApiService.fetchAllPages<any>(apiKey, '/invoicing/v1/documents/invoice');
        console.log(`[Holded] invoices: ${invoices.length}`);

        // 4. Invoice line items — requires individual detail fetch per invoice
        const allLines: any[] = [];
        for (const inv of invoices) {
            try {
                const detail = await HoldedApiService.fetchInvoiceDetail(apiKey, inv.id);
                if (!detail) continue;
                // Holded returns line items as `products` or `items`
                const items: any[] = detail.products || detail.items || [];
                items.forEach((item: any, idx: number) => {
                    allLines.push({ ...item, invoice_id: inv.id, _lineIdx: idx });
                });
            } catch {
                // skip failed detail fetch silently
            }
        }
        console.log(`[Holded] invoice lines: ${allLines.length}`);

        // 5. Accounting — daily ledger (best effort)
        let ledgerEntries: any[] = [];
        try {
            const qp: Record<string, string> = {};
            if (dateFrom) qp['dateFrom'] = dateFrom;
            if (dateTo)   qp['dateTo']   = dateTo;
            const qs = new URLSearchParams(qp).toString();
            const url = `${HOLDED_API}/accounting/v1/dailyledger${qs ? '?' + qs : ''}`;
            const res = await fetch(url, { headers: HoldedApiService.headers(apiKey) });
            if (res.ok) {
                const data = await res.json() as any;
                ledgerEntries = Array.isArray(data) ? data : [];
            } else {
                console.warn(`[Holded] Could not fetch daily ledger (HTTP ${res.status})`);
            }
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
            ['id', 'number', 'date', 'due_date', 'contact_id', 'contact', 'contact_code',
             'currency', 'exchange_rate', 'subtotal', 'discount', 'taxes', 'total', 'status', 'paid', 'pending'],
            invoices.map((inv: any) => [
                inv.id, inv.docNumber || '',
                HoldedApiService.formatDate(inv.date),
                HoldedApiService.formatDate(inv.dueDate),
                inv.contactId || '', inv.contactName || '', inv.contactCode || '',
                inv.currency || 'EUR', inv.currencyChange ?? 1,
                inv.subtotal ?? 0, inv.discount ?? 0, inv.tax ?? 0, inv.total ?? 0,
                inv.status ?? 0, inv.paid ?? 0, inv.pending ?? 0
            ])
        );

        // invoice_lines.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'invoice_lines.csv'),
            ['id', 'invoice_id', 'product_id', 'name', 'sku', 'quantity',
             'unit_price', 'discount', 'subtotal', 'total', 'tax_pct', 'type'],
            allLines.map((line: any, idx: number) => [
                `${line.invoice_id}_${idx}`,
                line.invoice_id, line.productId || '',
                line.name || '', line.sku || '',
                line.units ?? line.qty ?? 1,
                line.price ?? 0, line.discount ?? 0,
                line.subtotal ?? 0, line.total ?? 0,
                line.tax ?? 0, line.kind || ''
            ])
        );

        // contacts.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'contacts.csv'),
            ['id', 'code', 'name', 'trade_name', 'email', 'phone', 'mobile', 'type', 'vat', 'country'],
            contacts.map((c: any) => [
                c.id, c.code || '', c.name || '', c.tradeName || '',
                c.email || '', c.phone || '', c.mobile || '',
                Array.isArray(c.type) ? c.type.join(',') : (c.type || ''),
                c.vatnumber || '', c.country || ''
            ])
        );

        // products.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'products.csv'),
            ['id', 'name', 'description', 'price', 'cost', 'tax_pct', 'type', 'sku', 'category_id', 'category'],
            products.map((p: any) => [
                p.id, p.name || '', p.desc || p.description || '',
                p.price ?? 0, p.cost ?? 0, p.tax ?? 0,
                p.kind || p.type || '', p.sku || p.barcode || '',
                p.categoryId || '', p.category || ''
            ])
        );

        // ledger.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'ledger.csv'),
            ['date', 'account', 'account_name', 'description', 'debit', 'credit', 'document_id'],
            ledgerEntries.map((e: any) => [
                HoldedApiService.formatDate(e.date) || e.date || '',
                e.account || '', e.accountName || e.account_name || '',
                e.desc || e.name || e.description || '',
                e.debit ?? e.debe ?? 0,
                e.credit ?? e.haber ?? 0,
                e.docId || e.doc_id || ''
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
