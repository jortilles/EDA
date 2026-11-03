import * as path from 'path';
import * as fs from 'fs';

// Holded API v2 — https://www.holded.com/developers/getting-started
// Bearer auth, cursor pagination ({ items, cursor, has_more }), snake_case fields
const HOLDED_API = 'https://api.holded.com/api/v2';
const PAGE_LIMIT = 200; // max allowed by v2 list endpoints
const MAX_RETRIES = 3;
const LEDGER_DEFAULT_START_DATE = '2000-01-01'; // /ledger-entries requires a date range: used when no dateFrom is given

/** CSV files written by downloadToFolder (one DuckDB table each) */
export const HOLDED_CSV_FILES = [
    'invoices.csv', 'invoice_lines.csv',
    'estimates.csv', 'estimate_lines.csv',
    'purchases.csv', 'purchase_lines.csv',
    'purchase_orders.csv', 'purchase_order_lines.csv',
    'funnels.csv', 'leads.csv',
    'contacts.csv', 'products.csv', 'ledger.csv'
];

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
    estimates: number;
    estimateLines: number;
    purchases: number;
    purchaseLines: number;
    purchaseOrders: number;
    purchaseOrderLines: number;
    funnels: number;
    funnelStages: number;
    leads: number;
}

/** Amounts of a document line computed from price × units and its percentages */
interface LineAmounts {
    units: number;
    price: number;
    discount: number;
    taxPct: number;
    retentionPct: number;
    subtotal: number;
    retention: number;
    total: number;
}

/** Cost and margin of a sales line (invoice or estimate) */
interface LineMargin {
    cost: number | null;
    margin: number | null;
    marginPct: number | null;
    costSource: '' | 'line' | 'product';
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

    /**
     * Date-time as "YYYY-MM-DD HH:MM:SS" (UTC). v2 documents CRM dates as ISO 8601 strings,
     * but unix timestamps (seconds, as in v1) are also accepted. The time zone suffix is
     * dropped so DuckDB detects a plain TIMESTAMP (TIMESTAMP WITH TIME ZONE is not mapped
     * to a date column by the data model).
     */
    private static isoDateTime(value: any): string {
        if (value === null || value === undefined || value === '') return '';
        const isUnix = typeof value === 'number' || /^\d{9,10}$/.test(String(value));
        const date = isUnix ? new Date(Number(value) * 1000) : new Date(String(value));
        if (isNaN(date.getTime())) return String(value);
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }

    /** Date part (YYYY-MM-DD) of a CRM date-time */
    private static isoDay(value: any): string {
        return HoldedApiService.isoDateTime(value).slice(0, 10);
    }

    /** Arrays of tags/taxes are flattened to a comma-separated string */
    private static joinList(list: any): string {
        if (!Array.isArray(list)) return '';
        return list.map(x => typeof x === 'object' ? (x?.name ?? x?.id ?? JSON.stringify(x)) : x).join(',');
    }

    /**
     * Flattens the `lines` of a list of documents (invoices, estimates, purchases),
     * tagging each line with its parent document id under `parentKey`.
     * Blank lines (no name, description, product or price) carry no data and are skipped.
     */
    private static flattenLines(docs: any[], parentKey: string): any[] {
        const lines: any[] = [];
        for (const doc of docs) {
            (doc.lines || []).forEach((line: any, idx: number) => {
                const isBlank = !line.name && !line.description && !line.product_id && !HoldedApiService.num(line.price);
                if (!isBlank) {
                    lines.push({ ...line, [parentKey]: doc.id, _lineIdx: idx });
                }
            });
        }
        return lines;
    }

    /**
     * v2 doesn't return line amounts, they are computed from price × units
     * with the line discount, tax and retention (IRPF) percentages
     */
    private static lineAmounts(line: any): LineAmounts {
        const units        = HoldedApiService.num(line.units);
        const price        = HoldedApiService.num(line.price);
        const discount     = HoldedApiService.num(line.discount);
        const taxPct       = HoldedApiService.lineTaxPct(line);
        const retentionPct = HoldedApiService.num(line.retention);
        const subtotal     = +(price * units * (1 - discount / 100)).toFixed(2);
        const taxAmount    = +(subtotal * taxPct / 100).toFixed(2);
        const retention    = +(subtotal * retentionPct / 100).toFixed(2);
        const total        = +(subtotal + taxAmount - retention).toFixed(2);
        return { units, price, discount, taxPct, retentionPct, subtotal, retention, total };
    }

    /**
     * Unit cost: the line's own cost_price (cost at sale time) when informed,
     * otherwise the current product cost. Without any cost the margin is left
     * empty (null) so it doesn't inflate margins with a 100% value.
     */
    private static lineMargin(line: any, amounts: LineAmounts, productCosts: Map<string, number>): LineMargin {
        const lineCost    = HoldedApiService.num(line.cost_price);
        const productCost = productCosts.get(line.product_id) || 0;
        const costSource  = lineCost > 0 ? 'line' : productCost > 0 ? 'product' : '';
        const unitCost    = costSource === 'line' ? lineCost : productCost;
        const cost        = costSource ? +(unitCost * amounts.units).toFixed(2) : null;
        const margin      = cost !== null ? +(amounts.subtotal - cost).toFixed(2) : null;
        const marginPct   = margin !== null && amounts.subtotal ? +(margin / amounts.subtotal * 100).toFixed(2) : null;
        return { cost, margin, marginPct, costSource };
    }

    /** Line id from Holded, or a stable fallback built from the parent id and the position */
    private static lineId(line: any, parentKey: string): string {
        return line.line_id || `${line[parentKey]}_${line._lineIdx}`;
    }

    /**
     * Estimate status as shown in Holded: the API returns "completed" for accepted
     * quotes and "failed" for rejected ones
     */
    private static estimateStatus(status: any): string {
        if (status === 'completed') return 'accepted';
        if (status === 'failed')    return 'rejected';
        return status || '';
    }

    /**
     * Best-effort download: the API key may lack the scope of an optional module
     * (accounting, CRM...). The error is logged and an empty list is returned so the
     * rest of the data model is still generated.
     */
    private static async optional<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
        try {
            return await fn();
        } catch (e: any) {
            console.warn(`[Holded] Error descargando ${label}:`, e.message);
            return [];
        }
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
        const invoiceLines = HoldedApiService.flattenLines(invoices, 'invoice_id');
        console.log(`[Holded] invoices: ${invoices.length} · lines: ${invoiceLines.length}`);

        // 4. Estimates (quotes) — same document shape as invoices
        const estimates = await HoldedApiService.optional('presupuestos', () =>
            HoldedApiService.fetchAllPages<any>(apiKey, '/estimates', dateQuery));
        const estimateLines = HoldedApiService.flattenLines(estimates, 'estimate_id');
        console.log(`[Holded] estimates: ${estimates.length} · lines: ${estimateLines.length}`);

        // 5. Purchases (supplier invoices)
        const purchases = await HoldedApiService.optional('compras', () =>
            HoldedApiService.fetchAllPages<any>(apiKey, '/purchases', dateQuery));
        const purchaseLines = HoldedApiService.flattenLines(purchases, 'purchase_id');
        console.log(`[Holded] purchases: ${purchases.length} · lines: ${purchaseLines.length}`);

        // 5b. Purchase orders sent to suppliers
        const purchaseOrders = await HoldedApiService.optional('pedidos de compra', () =>
            HoldedApiService.fetchAllPages<any>(apiKey, '/purchase-orders', dateQuery));
        const purchaseOrderLines = HoldedApiService.flattenLines(purchaseOrders, 'purchase_order_id');
        console.log(`[Holded] purchase orders: ${purchaseOrders.length} · lines: ${purchaseOrderLines.length}`);

        // 6. CRM sales funnels with their stages, and the leads (deals) in them.
        //    Leads have no date filter: the whole pipeline is downloaded.
        const funnels = await HoldedApiService.optional('embudos de venta', () =>
            HoldedApiService.fetchAllPages<any>(apiKey, '/funnels'));
        const leads = funnels.length
            ? await HoldedApiService.optional('leads', () => HoldedApiService.fetchAllPages<any>(apiKey, '/leads'))
            : [];
        const funnelStages: any[] = [];
        for (const funnel of funnels) {
            (funnel.stages || []).forEach((stage: any, idx: number) =>
                funnelStages.push({ ...stage, funnel_id: funnel.id, _order: idx + 1 }));
        }
        console.log(`[Holded] funnels: ${funnels.length} · stages: ${funnelStages.length} · leads: ${leads.length}`);

        // 7. Accounting — ledger entries + chart of accounts for the names
        const accountNames = new Map<string, string>();
        const ledgerEntries = await HoldedApiService.optional('asientos contables', async () => {
            // Unlike the other endpoints, start_date and end_date are mandatory here
            const ledgerQuery = {
                start_date: dateFrom || LEDGER_DEFAULT_START_DATE,
                end_date:   dateTo   || new Date().toISOString().slice(0, 10)
            };
            const entries = await HoldedApiService.fetchAllPages<any>(apiKey, '/ledger-entries', ledgerQuery);
            const accounts = await HoldedApiService.fetchAllPages<any>(apiKey, '/accounting-accounts');
            accounts.forEach((a: any) => accountNames.set(String(a.number), a.name));
            return entries;
        });
        console.log(`[Holded] ledger entries: ${ledgerEntries.length}`);

        // Ensure folder exists
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const num = HoldedApiService.num;

        // Current catalogue cost per product, fallback for lines without their own cost
        const productCosts = new Map<string, number>();
        products.forEach((p: any) => productCosts.set(p.id, num(p.cost)));

        // invoices.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'invoices.csv'),
            ['invoice_id', 'invoice_number', 'invoice_date', 'invoice_due_date', 'contact_id', 'contact_name',
             'invoice_description', 'invoice_currency', 'invoice_subtotal', 'invoice_discount', 'invoice_taxes',
             'invoice_total', 'invoice_status', 'invoice_paid', 'invoice_pending'],
            invoices.map((inv: any) => [
                inv.id, inv.document_number || '',
                inv.date || '', inv.due_date || '',
                inv.contact_id || '', inv.contact_name || '', inv.description || '',
                inv.currency || 'EUR',
                num(inv.subtotal), num(inv.discount), num(inv.tax), num(inv.total),
                inv.status || '', num(inv.payments_total), num(inv.payments_pending)
            ])
        );

        // invoice_lines.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'invoice_lines.csv'),
            ['invoice_line_id', 'invoice_id', 'product_id', 'product_name', 'invoice_line_description', 'product_sku',
             'invoice_line_quantity', 'invoice_line_unit_price', 'invoice_line_discount_pct', 'invoice_line_subtotal',
             'invoice_line_total', 'invoice_line_tax_pct', 'invoice_line_account', 'invoice_line_retention_pct',
             'invoice_line_retention', 'invoice_line_cost', 'invoice_line_margin', 'invoice_line_margin_pct',
             'invoice_line_cost_source'],
            invoiceLines.map((line: any) => {
                const a = HoldedApiService.lineAmounts(line);
                const m = HoldedApiService.lineMargin(line, a, productCosts);
                return [
                    HoldedApiService.lineId(line, 'invoice_id'),
                    line.invoice_id, line.product_id || '',
                    line.name || '', line.description || '', line.sku || '',
                    a.units, a.price, a.discount, a.subtotal, a.total, a.taxPct,
                    line.account || '',
                    a.retentionPct, a.retention,
                    m.cost, m.margin, m.marginPct, m.costSource
                ];
            })
        );

        // estimates.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'estimates.csv'),
            ['estimate_id', 'estimate_number', 'estimate_date', 'estimate_due_date', 'contact_id', 'contact_name',
             'estimate_description', 'estimate_currency', 'estimate_subtotal', 'estimate_discount', 'estimate_taxes',
             'estimate_total', 'estimate_status', 'estimate_tags'],
            estimates.map((est: any) => [
                est.id, est.document_number || '',
                est.date || '', est.due_date || '',
                est.contact_id || '', est.contact_name || '', est.description || '',
                est.currency || 'EUR',
                num(est.subtotal), num(est.discount), num(est.tax), num(est.total),
                HoldedApiService.estimateStatus(est.status), HoldedApiService.joinList(est.tags)
            ])
        );

        // estimate_lines.csv — quoted cost and margin, same rules as invoice lines
        HoldedApiService.writeCsv(path.join(folderPath, 'estimate_lines.csv'),
            ['estimate_line_id', 'estimate_id', 'product_id', 'product_name', 'estimate_line_description', 'product_sku',
             'estimate_line_quantity', 'estimate_line_unit_price', 'estimate_line_discount_pct', 'estimate_line_subtotal',
             'estimate_line_total', 'estimate_line_tax_pct', 'estimate_line_retention_pct', 'estimate_line_retention',
             'estimate_line_cost', 'estimate_line_margin', 'estimate_line_margin_pct', 'estimate_line_cost_source'],
            estimateLines.map((line: any) => {
                const a = HoldedApiService.lineAmounts(line);
                const m = HoldedApiService.lineMargin(line, a, productCosts);
                return [
                    HoldedApiService.lineId(line, 'estimate_id'),
                    line.estimate_id, line.product_id || '',
                    line.name || '', line.description || '', line.sku || '',
                    a.units, a.price, a.discount, a.subtotal, a.total, a.taxPct,
                    a.retentionPct, a.retention,
                    m.cost, m.margin, m.marginPct, m.costSource
                ];
            })
        );

        // purchases.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'purchases.csv'),
            ['purchase_id', 'purchase_number', 'purchase_date', 'purchase_accounting_date', 'purchase_due_date',
             'contact_id', 'contact_name', 'purchase_description', 'purchase_currency', 'purchase_subtotal',
             'purchase_discount', 'purchase_taxes', 'purchase_total', 'purchase_status', 'purchase_paid',
             'purchase_pending', 'purchase_tags'],
            purchases.map((pur: any) => [
                pur.id, pur.document_number || '',
                pur.date || '', pur.deduction_date || '', pur.due_date || '',
                pur.contact_id || '', pur.contact_name || '', pur.description || '',
                pur.currency || 'EUR',
                num(pur.subtotal), num(pur.discount), num(pur.tax), num(pur.total),
                pur.status || '', num(pur.payments_total), num(pur.payments_pending),
                HoldedApiService.joinList(pur.tags)
            ])
        );

        // purchase_lines.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'purchase_lines.csv'),
            ['purchase_line_id', 'purchase_id', 'product_id', 'product_name', 'purchase_line_description', 'product_sku',
             'purchase_line_quantity', 'purchase_line_unit_price', 'purchase_line_discount_pct', 'purchase_line_subtotal',
             'purchase_line_total', 'purchase_line_tax_pct', 'purchase_line_account', 'purchase_line_retention_pct',
             'purchase_line_retention'],
            purchaseLines.map((line: any) => {
                const a = HoldedApiService.lineAmounts(line);
                return [
                    HoldedApiService.lineId(line, 'purchase_id'),
                    line.purchase_id, line.product_id || '',
                    line.name || '', line.description || '', line.sku || '',
                    a.units, a.price, a.discount, a.subtotal, a.total, a.taxPct,
                    line.account || '',
                    a.retentionPct, a.retention
                ];
            })
        );

        // purchase_orders.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'purchase_orders.csv'),
            ['purchase_order_id', 'purchase_order_number', 'purchase_order_date', 'purchase_order_due_date',
             'contact_id', 'contact_name', 'purchase_order_description', 'purchase_order_currency',
             'purchase_order_subtotal', 'purchase_order_discount', 'purchase_order_taxes', 'purchase_order_total',
             'purchase_order_status', 'purchase_order_tags'],
            purchaseOrders.map((po: any) => [
                po.id, po.document_number || '',
                po.date || '', po.due_date || '',
                po.contact_id || '', po.contact_name || '', po.description || '',
                po.currency || 'EUR',
                num(po.subtotal), num(po.discount), num(po.tax), num(po.total),
                po.status || '', HoldedApiService.joinList(po.tags)
            ])
        );

        // purchase_order_lines.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'purchase_order_lines.csv'),
            ['purchase_order_line_id', 'purchase_order_id', 'product_id', 'product_name',
             'purchase_order_line_description', 'product_sku', 'purchase_order_line_quantity',
             'purchase_order_line_unit_price', 'purchase_order_line_discount_pct', 'purchase_order_line_subtotal',
             'purchase_order_line_total', 'purchase_order_line_tax_pct', 'purchase_order_line_account',
             'purchase_order_line_retention_pct', 'purchase_order_line_retention'],
            purchaseOrderLines.map((line: any) => {
                const a = HoldedApiService.lineAmounts(line);
                return [
                    HoldedApiService.lineId(line, 'purchase_order_id'),
                    line.purchase_order_id, line.product_id || '',
                    line.name || '', line.description || '', line.sku || '',
                    a.units, a.price, a.discount, a.subtotal, a.total, a.taxPct,
                    line.account || '',
                    a.retentionPct, a.retention
                ];
            })
        );

        // funnels.csv — funnels and their stages in a single table: one row per stage,
        // and one row with empty stage columns for a funnel without stages
        const stageProbability = new Map<string, number>();
        funnelStages.forEach((s: any) => stageProbability.set(s.id, num(s.deal_probability)));
        const funnelRows: any[][] = [];
        for (const f of funnels) {
            const funnelCols = [
                f.id, f.name || '',
                HoldedApiService.isoDateTime(f.created_at), HoldedApiService.isoDateTime(f.updated_at)
            ];
            const stages = funnelStages.filter((s: any) => s.funnel_id === f.id);
            if (!stages.length) funnelRows.push([...funnelCols, '', '', '', '', '']);
            stages.forEach((s: any) => funnelRows.push([
                ...funnelCols,
                s.id, s.name || '', s._order, num(s.deal_probability), num(s.rotting_days)
            ]));
        }
        HoldedApiService.writeCsv(path.join(folderPath, 'funnels.csv'),
            ['funnel_id', 'funnel_name', 'funnel_created_at', 'funnel_updated_at',
             'stage_id', 'stage_name', 'stage_order', 'stage_probability', 'stage_rotting_days'],
            funnelRows
        );
        // Stages used to be written to their own file: remove it so it no longer becomes a table
        const legacyStagesFile = path.join(folderPath, 'funnel_stages.csv');
        if (fs.existsSync(legacyStagesFile)) fs.unlinkSync(legacyStagesFile);

        // leads.csv — the weighted value (value × stage probability) is the pipeline forecast
        HoldedApiService.writeCsv(path.join(folderPath, 'leads.csv'),
            ['lead_id', 'lead_name', 'funnel_id', 'stage_id', 'contact_id', 'contact_name', 'lead_person_name',
             'lead_status', 'lead_value', 'lead_potential', 'lead_weighted_value', 'lead_due_date',
             'lead_created_at', 'lead_updated_at', 'lead_assigned_to'],
            leads.map((l: any) => {
                const value = num(l.value);
                const probability = stageProbability.get(l.stage_id) || 0;
                return [
                    l.id, l.name || '', l.funnel_id || '', l.stage_id || '',
                    l.contact_id || '', l.contact_name || '', l.person_name || '',
                    l.status || '', value, num(l.potential),
                    +(value * probability / 100).toFixed(2),
                    HoldedApiService.isoDay(l.due_date),
                    HoldedApiService.isoDateTime(l.created_at), HoldedApiService.isoDateTime(l.updated_at),
                    l.assigned_to || ''
                ];
            })
        );

        // contacts.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'contacts.csv'),
            ['contact_id', 'contact_code', 'contact_name', 'contact_trade_name', 'contact_email', 'contact_phone',
             'contact_mobile', 'contact_type', 'contact_vat', 'contact_country'],
            contacts.map((c: any) => [
                c.id, c.code || '', c.name || '', c.trade_name || '',
                c.email || '', c.phone || '', c.mobile || '',
                c.type || '', c.vat_number || '',
                c.bill_address?.country || c.bill_address?.country_code || ''
            ])
        );

        // products.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'products.csv'),
            ['product_id', 'product_name', 'product_description', 'product_price', 'product_cost', 'product_tax_codes',
             'product_type', 'product_sku', 'product_category_id', 'product_stock'],
            products.map((p: any) => [
                p.id, p.name || '', p.description || '',
                num(p.price), num(p.cost), HoldedApiService.joinList(p.taxes),
                p.kind || '', p.sku || p.barcode || '',
                p.category_id || '', num(p.stock)
            ])
        );

        // ledger.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'ledger.csv'),
            ['entry_line_id', 'entry_number', 'entry_line', 'entry_date', 'entry_type', 'account_code', 'account_name',
             'entry_description', 'entry_doc_description', 'entry_debit', 'entry_credit'],
            ledgerEntries.map((e: any) => [
                e.id, e.entry_number ?? '', e.line ?? '',
                HoldedApiService.isoDate(e.date), e.type || '',
                e.account ?? '', accountNames.get(String(e.account)) || '',
                e.description || '', e.doc_description || '',
                num(e.debit), num(e.credit)
            ])
        );

        console.log(`[Holded] ${HOLDED_CSV_FILES.length} CSV files written to ${folderPath}`);

        return {
            invoices: invoices.length,
            lines: invoiceLines.length,
            contacts: contacts.length,
            products: products.length,
            ledgerEntries: ledgerEntries.length,
            estimates: estimates.length,
            estimateLines: estimateLines.length,
            purchases: purchases.length,
            purchaseLines: purchaseLines.length,
            purchaseOrders: purchaseOrders.length,
            purchaseOrderLines: purchaseOrderLines.length,
            funnels: funnels.length,
            funnelStages: funnelStages.length,
            leads: leads.length
        };
    }
}
