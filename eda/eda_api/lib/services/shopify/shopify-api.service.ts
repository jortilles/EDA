import * as path from 'path';
import * as fs from 'fs';

const SHOPIFY_API_VERSION = '2024-01';
const shopifyConfig = require('../../../config/shopify.config');

export interface ShopifyDownloadParams {
    shop: string;       // e.g. mi-tienda.myshopify.com
    accessToken: string;
    dateFrom?: string;  // YYYY-MM-DD
    dateTo?: string;    // YYYY-MM-DD
}

export interface ShopifyDownloadResult {
    orders: number;
    orderLines: number;
    customers: number;
    products: number;
    variants: number;
}

export class ShopifyApiService {

    static normalizeShop(shop: string): string {
        const clean = shop.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
        return clean.includes('.') ? clean : `${clean}.myshopify.com`;
    }

    private static baseUrl(shop: string): string {
        return `https://${ShopifyApiService.normalizeShop(shop)}/admin/api/${SHOPIFY_API_VERSION}`;
    }

    private static headers(accessToken: string): Record<string, string> {
        return {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
        };
    }

    static async testConnection(shop: string, accessToken: string): Promise<void> {
        const url = `${ShopifyApiService.baseUrl(shop)}/shop.json`;
        const res = await fetch(url, { headers: ShopifyApiService.headers(accessToken) });
        if (!res.ok) {
            throw new Error(`No se pudo conectar a Shopify (HTTP ${res.status}). Comprueba la URL de la tienda y el Access Token.`);
        }
    }

    private static async fetchAllPages<T>(
        shop: string,
        accessToken: string,
        endpoint: string,
        params: Record<string, string> = {}
    ): Promise<T[]> {
        const results: T[] = [];
        const baseParams = new URLSearchParams({ limit: '250', ...params });
        let url: string | null = `${ShopifyApiService.baseUrl(shop)}${endpoint}?${baseParams}`;

        while (url) {
            const res = await fetch(url, { headers: ShopifyApiService.headers(accessToken) });
            if (!res.ok) {
                console.warn(`[Shopify] HTTP ${res.status} en ${url}`);
                break;
            }
            const data = await res.json() as any;
            const key = Object.keys(data)[0];
            const items: T[] = Array.isArray(data[key]) ? data[key] : [];
            results.push(...items);

            // Shopify pagination via Link header
            const linkHeader = res.headers.get('Link') || '';
            const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            url = nextMatch ? nextMatch[1] : null;
        }

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
        const lines = [headers.join(','), ...rows.map(r => ShopifyApiService.toCsvRow(r))];
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    }

    static async downloadToFolder(
        params: ShopifyDownloadParams,
        folderPath: string
    ): Promise<ShopifyDownloadResult> {
        const { shop, accessToken, dateFrom, dateTo } = params;

        console.log(`[Shopify] Starting download → ${folderPath}`);

        // Build date filters for orders
        const orderParams: Record<string, string> = { status: 'any' };
        if (dateFrom) orderParams['created_at_min'] = `${dateFrom}T00:00:00`;
        if (dateTo)   orderParams['created_at_max'] = `${dateTo}T23:59:59`;

        // 1. Orders
        const orders = await ShopifyApiService.fetchAllPages<any>(shop, accessToken, '/orders.json', orderParams);
        console.log(`[Shopify] orders: ${orders.length}`);

        // 2. Extract order line items
        const orderLines: any[] = [];
        for (const order of orders) {
            const items: any[] = order.line_items || [];
            items.forEach(item => orderLines.push({ ...item, order_id: order.id }));
        }
        console.log(`[Shopify] order lines: ${orderLines.length}`);

        // 3. Customers
        const customers = await ShopifyApiService.fetchAllPages<any>(shop, accessToken, '/customers.json');
        console.log(`[Shopify] customers: ${customers.length}`);

        // 4. Products (includes variants)
        const products = await ShopifyApiService.fetchAllPages<any>(shop, accessToken, '/products.json');
        console.log(`[Shopify] products: ${products.length}`);

        // 5. Extract variants
        const variants: any[] = [];
        for (const p of products) {
            (p.variants || []).forEach((v: any) => variants.push({ ...v, product_id: p.id }));
        }
        console.log(`[Shopify] variants: ${variants.length}`);

        // Ensure folder exists
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        // orders.csv
        ShopifyApiService.writeCsv(path.join(folderPath, 'orders.csv'),
            ['id', 'order_number', 'created_at', 'processed_at', 'customer_id',
             'financial_status', 'fulfillment_status', 'subtotal_price',
             'total_discounts', 'total_tax', 'total_price', 'currency'],
            orders.map(o => [
                o.id, o.order_number,
                o.created_at ? o.created_at.split('T')[0] : '',
                o.processed_at ? o.processed_at.split('T')[0] : '',
                o.customer?.id ?? '',
                o.financial_status ?? '', o.fulfillment_status ?? '',
                o.subtotal_price ?? 0, o.total_discounts ?? 0,
                o.total_tax ?? 0, o.total_price ?? 0,
                o.currency ?? ''
            ])
        );

        // order_lines.csv
        ShopifyApiService.writeCsv(path.join(folderPath, 'order_lines.csv'),
            ['id', 'order_id', 'product_id', 'variant_id', 'title',
             'sku', 'quantity', 'price', 'total_discount', 'vendor'],
            orderLines.map(l => [
                l.id, l.order_id, l.product_id ?? '', l.variant_id ?? '',
                l.title ?? '', l.sku ?? '',
                l.quantity ?? 0, l.price ?? 0, l.total_discount ?? 0,
                l.vendor ?? ''
            ])
        );

        // customers.csv
        ShopifyApiService.writeCsv(path.join(folderPath, 'customers.csv'),
            ['id', 'email', 'first_name', 'last_name', 'phone',
             'city', 'province', 'country', 'orders_count', 'total_spent', 'created_at'],
            customers.map(c => {
                const addr = c.default_address || {};
                return [
                    c.id, c.email ?? '', c.first_name ?? '', c.last_name ?? '',
                    c.phone ?? '', addr.city ?? '', addr.province ?? '', addr.country ?? '',
                    c.orders_count ?? 0, c.total_spent ?? 0,
                    c.created_at ? c.created_at.split('T')[0] : ''
                ];
            })
        );

        // products.csv
        ShopifyApiService.writeCsv(path.join(folderPath, 'products.csv'),
            ['id', 'title', 'vendor', 'product_type', 'status', 'created_at', 'tags'],
            products.map(p => [
                p.id, p.title ?? '', p.vendor ?? '', p.product_type ?? '',
                p.status ?? '', p.created_at ? p.created_at.split('T')[0] : '',
                p.tags ?? ''
            ])
        );

        // variants.csv
        ShopifyApiService.writeCsv(path.join(folderPath, 'variants.csv'),
            ['id', 'product_id', 'title', 'sku', 'price', 'compare_at_price', 'inventory_quantity'],
            variants.map(v => [
                v.id, v.product_id, v.title ?? '', v.sku ?? '',
                v.price ?? 0, v.compare_at_price ?? 0, v.inventory_quantity ?? 0
            ])
        );

        console.log(`[Shopify] 5 CSV files written to ${folderPath}`);

        return {
            orders: orders.length,
            orderLines: orderLines.length,
            customers: customers.length,
            products: products.length,
            variants: variants.length,
        };
    }

    // ── OAuth helpers ─────────────────────────────────────────────────────────

    static isOAuthConfigured(): boolean {
        return !!(shopifyConfig.CLIENT_ID && shopifyConfig.CLIENT_ID !== 'XXX' &&
                  shopifyConfig.CLIENT_SECRET && shopifyConfig.CLIENT_SECRET !== 'YYY');
    }

    static buildAuthUrl(shop: string, clientId: string, state: string): string {
        const params = new URLSearchParams({
            client_id:    clientId,
            scope:        shopifyConfig.SCOPES,
            redirect_uri: shopifyConfig.REDIRECT_URI,
            state,
        });
        return `https://${ShopifyApiService.normalizeShop(shop)}/admin/oauth/authorize?${params}`;
    }

    static async exchangeCodeForToken(shop: string, clientId: string, clientSecret: string, code: string): Promise<string> {
        const host = ShopifyApiService.normalizeShop(shop);
        const res = await fetch(`https://${host}/admin/oauth/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id:     clientId,
                client_secret: clientSecret,
                code,
            }),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Error intercambiando código OAuth de Shopify (HTTP ${res.status}): ${text}`);
        }
        const data = await res.json() as any;
        if (!data.access_token) {
            throw new Error('Shopify no devolvió access_token');
        }
        return data.access_token;
    }
}
