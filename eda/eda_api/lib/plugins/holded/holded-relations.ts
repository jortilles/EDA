import { linkTables } from '../plugin-relations';

/**
 * Sets the Holded data model relations. The name-based relations guessed by
 * setRelations (e.g. invoice_lines.product_name ↔ products.product_name) are dropped:
 * the model is fully described by its explicit foreign keys.
 */
export function addHoldedRelations(tables: any[]): void {
    tables.forEach((t: any) => t.relations = []);
    linkTables(tables, 'invoice_lines', 'invoice_id', 'invoices', 'invoice_id');
    linkTables(tables, 'invoices',      'contact_id', 'contacts', 'contact_id');
    linkTables(tables, 'invoice_lines', 'product_id', 'products', 'product_id');
}
