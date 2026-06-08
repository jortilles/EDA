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

        console.log(`[Holded] Iniciando descarga → ${folderPath}`);

        // 1. Contacts
        const contacts = await HoldedApiService.fetchAllPages<any>(apiKey, '/contacts/v1/contacts');
        console.log(`[Holded] Contactos: ${contacts.length}`);

        // 2. Products
        const products = await HoldedApiService.fetchAllPages<any>(apiKey, '/products/v1/products');
        console.log(`[Holded] Productos: ${products.length}`);

        // 3. Invoice list
        const invoices = await HoldedApiService.fetchAllPages<any>(apiKey, '/invoicing/v1/documents/invoice');
        console.log(`[Holded] Facturas: ${invoices.length}`);

        // 4. Invoice line items — requires individual detail fetch per invoice
        const allLines: any[] = [];
        for (const inv of invoices) {
            try {
                const detail = await HoldedApiService.fetchInvoiceDetail(apiKey, inv.id);
                if (!detail) continue;
                // Holded returns line items as `products` or `items`
                const items: any[] = detail.products || detail.items || [];
                items.forEach((item: any, idx: number) => {
                    allLines.push({ ...item, factura_id: inv.id, _lineIdx: idx });
                });
            } catch {
                // skip failed detail fetch silently
            }
        }
        console.log(`[Holded] Líneas de factura: ${allLines.length}`);

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
                console.warn(`[Holded] No se pudo obtener el libro diario (HTTP ${res.status})`);
            }
        } catch (e: any) {
            console.warn('[Holded] Error descargando asientos contables:', e.message);
        }
        console.log(`[Holded] Asientos contables: ${ledgerEntries.length}`);

        // Ensure folder exists
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        // facturas.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'facturas.csv'),
            ['id', 'numero', 'fecha', 'fecha_vencimiento', 'contacto_id', 'contacto', 'codigo_contacto',
             'divisa', 'tipo_cambio', 'subtotal', 'descuento', 'impuestos', 'total', 'estado', 'pagado', 'pendiente'],
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

        // facturas_lineas.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'facturas_lineas.csv'),
            ['id', 'factura_id', 'producto_id', 'nombre', 'sku', 'unidades',
             'precio_unitario', 'descuento', 'subtotal', 'total', 'impuesto_pct', 'tipo'],
            allLines.map((line: any, idx: number) => [
                `${line.factura_id}_${idx}`,
                line.factura_id, line.productId || '',
                line.name || '', line.sku || '',
                line.units ?? line.qty ?? 1,
                line.price ?? 0, line.discount ?? 0,
                line.subtotal ?? 0, line.total ?? 0,
                line.tax ?? 0, line.kind || ''
            ])
        );

        // contactos.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'contactos.csv'),
            ['id', 'codigo', 'nombre', 'nombre_comercial', 'email', 'telefono', 'movil', 'tipo', 'nif', 'pais'],
            contacts.map((c: any) => [
                c.id, c.code || '', c.name || '', c.tradeName || '',
                c.email || '', c.phone || '', c.mobile || '',
                Array.isArray(c.type) ? c.type.join(',') : (c.type || ''),
                c.vatnumber || '', c.country || ''
            ])
        );

        // productos.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'productos.csv'),
            ['id', 'nombre', 'descripcion', 'precio', 'coste', 'impuesto_pct', 'tipo', 'sku', 'categoria_id', 'categoria'],
            products.map((p: any) => [
                p.id, p.name || '', p.desc || p.description || '',
                p.price ?? 0, p.cost ?? 0, p.tax ?? 0,
                p.kind || p.type || '', p.sku || p.barcode || '',
                p.categoryId || '', p.category || ''
            ])
        );

        // asientos.csv
        HoldedApiService.writeCsv(path.join(folderPath, 'asientos.csv'),
            ['fecha', 'cuenta', 'nombre_cuenta', 'descripcion', 'debe', 'haber', 'documento_id'],
            ledgerEntries.map((e: any) => [
                HoldedApiService.formatDate(e.date) || e.date || '',
                e.account || '', e.accountName || e.account_name || '',
                e.desc || e.name || e.description || '',
                e.debit ?? e.debe ?? 0,
                e.credit ?? e.haber ?? 0,
                e.docId || e.doc_id || ''
            ])
        );

        console.log(`[Holded] 5 archivos CSV escritos en ${folderPath}`);

        return {
            invoices: invoices.length,
            lines: allLines.length,
            contacts: contacts.length,
            products: products.length,
            ledgerEntries: ledgerEntries.length
        };
    }
}
