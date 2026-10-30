import { linkTables } from '../plugin-relations';

/**
 * Sets the Holded data model relations. The name-based relations guessed by
 * setRelations (e.g. invoice_lines.product_name ↔ products.product_name) are dropped:
 * the model is fully described by its explicit foreign keys.
 * contacts and products are shared dimensions of sales, quotes, purchases and CRM.
 */
export function addHoldedRelations(tables: any[]): void {
    tables.forEach((t: any) => t.relations = []);

    // Sales invoices
    linkTables(tables, 'invoice_lines',  'invoice_id',  'invoices',      'invoice_id');
    linkTables(tables, 'invoices',       'contact_id',  'contacts',      'contact_id');
    linkTables(tables, 'invoice_lines',  'product_id',  'products',      'product_id');

    // Estimates (quotes)
    linkTables(tables, 'estimate_lines', 'estimate_id', 'estimates',     'estimate_id');
    linkTables(tables, 'estimates',      'contact_id',  'contacts',      'contact_id');
    linkTables(tables, 'estimate_lines', 'product_id',  'products',      'product_id');

    // Purchases
    linkTables(tables, 'purchase_lines', 'purchase_id', 'purchases',     'purchase_id');
    linkTables(tables, 'purchases',      'contact_id',  'contacts',      'contact_id');
    linkTables(tables, 'purchase_lines', 'product_id',  'products',      'product_id');

    // Purchase orders
    linkTables(tables, 'purchase_order_lines', 'purchase_order_id', 'purchase_orders', 'purchase_order_id');
    linkTables(tables, 'purchase_orders',      'contact_id',        'contacts',        'contact_id');
    linkTables(tables, 'purchase_order_lines', 'product_id',        'products',        'product_id');

    // CRM: funnels.csv holds one row per funnel stage, so leads join it by their stage
    linkTables(tables, 'leads',          'stage_id',    'funnels',       'stage_id');
    linkTables(tables, 'leads',          'contact_id',  'contacts',      'contact_id');

    applyHoldedVisibility(tables);
}

/** Holded internal identifiers (invoice_id, contact_id, entry_line_id, ...) */
const HOLDED_TECHNICAL_ID = /_id$/;

/**
 * Hides from end users the Holded internal ids: opaque hashes only needed to join tables
 * (relations do not depend on column visibility).
 */
export function applyHoldedVisibility(tables: any[]): void {
    for (const table of tables) {
        for (const col of table.columns || []) {
            if (HOLDED_TECHNICAL_ID.test(col.column_name)) col.visible = false;
        }
    }
}
