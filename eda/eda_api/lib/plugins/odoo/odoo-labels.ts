export type OdooLocale = 'en' | 'es';

const TABLE_LABELS: Record<string, Record<OdooLocale, string>> = {
    invoices:      { en: 'Invoices',      es: 'Facturas' },
    orders:        { en: 'Orders',        es: 'Pedidos' },
    partners:      { en: 'Partners',      es: 'Clientes' },
    products:      { en: 'Products',      es: 'Productos' },
    users:         { en: 'Salespeople',   es: 'Vendedores' },
};

const TABLE_DESCRIPTIONS: Record<string, Record<OdooLocale, string>> = {
    invoices:      { en: 'Posted invoices, bills and credit notes — one row per line', es: 'Facturas contabilizadas — una fila por línea' },
    orders:        { en: 'Confirmed sales orders — one row per line',                  es: 'Pedidos de venta — una fila por línea' },
    partners:      { en: 'Customers and suppliers',                                    es: 'Clientes y proveedores' },
    products:      { en: 'Product catalogue',                                          es: 'Catálogo de productos' },
    users:         { en: 'Odoo users (salespeople)',                                   es: 'Usuarios de Odoo (vendedores)' },
};

const COLUMN_LABELS: Record<string, Record<OdooLocale, string>> = {
    // shared
    id:               { en: 'ID',                  es: 'ID' },
    name:             { en: 'Name',                es: 'Nombre' },
    type:             { en: 'Type',                es: 'Tipo' },
    status:           { en: 'Status',              es: 'Estado' },
    total:            { en: 'Total',               es: 'Total' },
    currency:         { en: 'Currency',            es: 'Moneda' },
    company:          { en: 'Company',             es: 'Empresa' },
    company_id:       { en: 'Company ID',          es: 'ID Empresa' },
    email:            { en: 'Email',               es: 'Email' },
    active:           { en: 'Active',              es: 'Activo' },
    sequence:         { en: 'Sequence',            es: 'Secuencia' },
    description:      { en: 'Description',         es: 'Descripción' },
    reference:        { en: 'Reference',           es: 'Referencia' },
    internal_ref:     { en: 'Internal Reference',  es: 'Referencia Interna' },
    category:         { en: 'Category',            es: 'Categoría' },
    category_id:      { en: 'Category ID',         es: 'ID Categoría' },
    country:          { en: 'Country',             es: 'País' },
    country_id:       { en: 'Country ID',          es: 'ID País' },
    city:             { en: 'City',                es: 'Ciudad' },

    // invoices / orders (shared)
    line_id:          { en: 'Line ID',             es: 'ID Línea' },
    invoice_number:   { en: 'Invoice Number',      es: 'Número de Factura' },
    order_number:     { en: 'Order Number',        es: 'Número de Pedido' },
    partner_id:       { en: 'Partner ID',          es: 'ID Cliente' },
    partner:          { en: 'Partner',             es: 'Cliente' },
    salesperson_id:   { en: 'Salesperson ID',      es: 'ID Vendedor' },
    salesperson:      { en: 'Salesperson',         es: 'Vendedor' },
    order_state:      { en: 'Order State',          es: 'Estado del Pedido' },
    tax_base:         { en: 'Tax Base',            es: 'Base Imponible' },
    taxes:            { en: 'Taxes',               es: 'Impuestos' },
    product_id:       { en: 'Product ID',          es: 'ID Producto' },
    product:          { en: 'Product',             es: 'Producto' },
    quantity:         { en: 'Quantity',            es: 'Cantidad' },
    unit_price:       { en: 'Unit Price',          es: 'Precio Unitario' },
    subtotal:         { en: 'Subtotal',            es: 'Subtotal' },
    total_with_taxes: { en: 'Total with Taxes',    es: 'Total con Impuestos' },
    cost_total:       { en: 'Cost Total',          es: 'Coste Total' },
    margin:           { en: 'Margin',              es: 'Margen Bruto' },
    margin_pct:       { en: 'Margin %',            es: 'Margen %' },

    // invoices only
    invoice_id:       { en: 'Invoice ID',          es: 'ID Factura' },
    invoice_date:     { en: 'Invoice Date',        es: 'Fecha Factura' },
    due_date:         { en: 'Due Date',            es: 'Fecha Vencimiento' },
    journal:          { en: 'Journal',             es: 'Diario' },
    account_id:       { en: 'Account ID',          es: 'ID Cuenta' },
    account:          { en: 'Account',             es: 'Cuenta' },

    // orders only
    order_id:         { en: 'Order ID',            es: 'ID Pedido' },
    order_date:       { en: 'Order Date',          es: 'Fecha Pedido' },

    // products
    productname:      { en: 'Product Name',        es: 'Nombre de Producto' },

    // partners
    phone:          { en: 'Phone',             es: 'Teléfono' },
    mobile:         { en: 'Mobile',            es: 'Móvil' },
    street:         { en: 'Street',            es: 'Dirección' },
    street2:        { en: 'Street 2',          es: 'Dirección 2' },
    zip:            { en: 'Zip Code',          es: 'Código Postal' },
    state_id:       { en: 'State ID',          es: 'ID Provincia' },
    state:          { en: 'State',             es: 'Provincia' },
    vat:            { en: 'VAT Number',        es: 'NIF' },
    is_company:     { en: 'Is Company',        es: 'Es Empresa' },
    is_customer:    { en: 'Customer Rank',     es: 'Es Cliente' },
    is_supplier:    { en: 'Supplier Rank',     es: 'Es Proveedor' },

    // products
    sale_description: { en: 'Sale Description',      es: 'Descripción de Venta' },
    sale_price:       { en: 'Sale Price',             es: 'Precio de Venta' },
    cost_price:       { en: 'Cost Price',             es: 'Precio de Coste' },
    uom_id:           { en: 'Unit of Measure ID',     es: 'ID Unidad Medida' },
    uom:              { en: 'Unit of Measure',        es: 'Unidad de Medida' },
    barcode:          { en: 'Barcode',                es: 'Código de Barras' },
    template_id:      { en: 'Template ID',            es: 'ID Plantilla' },

    // users
    login:          { en: 'Login',          es: 'Login' },
    external_user:  { en: 'External User',  es: 'Usuario Externo' },
};

const COLUMN_DESCRIPTIONS: Record<string, Record<OdooLocale, string>> = {
    id:               { en: 'Odoo internal record identifier',           es: 'Identificador interno de registro en Odoo' },
    name:             { en: 'Display name',                              es: 'Nombre de visualización' },
    line_id:          { en: 'Unique identifier of the document line',     es: 'Identificador único de la línea del documento' },
    invoice_number:   { en: 'Invoice number',                            es: 'Número de factura' },
    order_number:     { en: 'Order number',                              es: 'Número de pedido' },
    partner_id:       { en: 'Partner foreign key → partners.id',         es: 'Clave foránea de cliente → partners.id' },
    partner:          { en: 'Partner display name',                      es: 'Nombre del cliente' },
    salesperson_id:   { en: 'Salesperson foreign key → users.id',        es: 'Clave foránea de vendedor → users.id' },
    salesperson:      { en: 'Salesperson display name',                  es: 'Nombre del vendedor' },
    order_state:      { en: 'Order state (draft, sale, done, cancel)',    es: 'Estado del pedido (draft, sale, done, cancel)' },
    type:             { en: 'Move type (out_invoice, in_invoice…)',       es: 'Tipo de movimiento (out_invoice, in_invoice…)' },
    status:           { en: 'Document state (posted, draft…)',           es: 'Estado del documento (posted, draft…)' },
    tax_base:         { en: 'Amount before taxes',                       es: 'Importe antes de impuestos' },
    taxes:            { en: 'Tax amount',                                es: 'Importe de impuestos' },
    total:            { en: 'Total amount including taxes',              es: 'Importe total con impuestos' },
    currency:         { en: 'Currency name',                             es: 'Nombre de la moneda' },
    journal:          { en: 'Accounting journal',                        es: 'Diario contable' },
    company:          { en: 'Company name',                              es: 'Nombre de la empresa' },
    reference:        { en: 'Vendor reference or purchase order number', es: 'Referencia del proveedor o número de pedido' },
    invoice_id:       { en: 'Invoice foreign key → invoices.id',         es: 'Clave foránea de factura → invoices.id' },
    invoice_date:     { en: 'Date the invoice was issued',               es: 'Fecha de emisión de la factura' },
    due_date:         { en: 'Payment due date',                          es: 'Fecha límite de pago' },
    order_id:         { en: 'Order foreign key → orders.id',             es: 'Clave foránea de pedido → orders.id' },
    order_date:       { en: 'Date the order was confirmed',              es: 'Fecha de confirmación del pedido' },
    product_id:       { en: 'Product foreign key → products.id',         es: 'Clave foránea de producto → products.id' },
    product:          { en: 'Product display name',                      es: 'Nombre del producto' },
    description:      { en: 'Line description',                          es: 'Descripción de la línea' },
    quantity:         { en: 'Quantity ordered or invoiced',              es: 'Cantidad pedida o facturada' },
    unit_price:       { en: 'Price per unit before discount',            es: 'Precio por unidad antes de descuento' },
    subtotal:         { en: 'Subtotal excluding taxes',                  es: 'Subtotal sin impuestos' },
    total_with_taxes: { en: 'Total including taxes',                     es: 'Total con impuestos' },
    cost_total:       { en: 'Total cost (unit cost × quantity)',          es: 'Coste total (coste unitario × cantidad)' },
    margin:           { en: 'Gross margin (subtotal − cost total)',       es: 'Margen bruto (subtotal − coste total)' },
    margin_pct:       { en: 'Margin percentage over subtotal',           es: 'Porcentaje de margen sobre subtotal' },
    account_id:       { en: 'Accounting account ID',                     es: 'ID de la cuenta contable' },
    account:          { en: 'Accounting account name',                   es: 'Nombre de la cuenta contable' },
    sequence:         { en: 'Display order within the document',         es: 'Orden de visualización dentro del documento' },
    productname:      { en: 'Product display name',                      es: 'Nombre del producto' },
    phone:            { en: 'Phone number',                              es: 'Número de teléfono' },
    mobile:           { en: 'Mobile phone number',                       es: 'Número de móvil' },
    street:           { en: 'Main address line',                         es: 'Línea principal de la dirección' },
    street2:          { en: 'Additional address line',                   es: 'Línea adicional de la dirección' },
    city:             { en: 'City',                                      es: 'Ciudad' },
    zip:              { en: 'Postal / ZIP code',                         es: 'Código postal' },
    country_id:       { en: 'Country foreign key',                       es: 'Clave foránea de país' },
    country:          { en: 'Country name',                              es: 'Nombre del país' },
    state_id:         { en: 'State / province foreign key',              es: 'Clave foránea de provincia' },
    state:            { en: 'State / province name',                     es: 'Nombre de la provincia' },
    vat:              { en: 'VAT / tax identification number',           es: 'NIF / número de identificación fiscal' },
    internal_ref:     { en: 'Internal reference code',                   es: 'Código de referencia interna' },
    company_id:       { en: 'Parent company foreign key',                es: 'Clave foránea de empresa matriz' },
    is_company:       { en: '1 if the partner is a company',             es: '1 si el contacto es una empresa' },
    is_customer:      { en: 'Customer rank (purchases count)',           es: 'Rango como cliente (nº de compras)' },
    is_supplier:      { en: 'Supplier rank (bills count)',               es: 'Rango como proveedor (nº de facturas recibidas)' },
    sale_description: { en: 'Description shown on sales orders',         es: 'Descripción que aparece en pedidos de venta' },
    sale_price:       { en: 'Public sale price',                         es: 'Precio de venta al público' },
    cost_price:       { en: 'Internal cost price',                       es: 'Precio de coste interno' },
    category_id:      { en: 'Product category foreign key',              es: 'Clave foránea de categoría de producto' },
    category:         { en: 'Product category name',                     es: 'Nombre de la categoría de producto' },
    uom_id:           { en: 'Unit of measure foreign key',               es: 'Clave foránea de unidad de medida' },
    uom:              { en: 'Unit of measure name',                      es: 'Nombre de la unidad de medida' },
    barcode:          { en: 'EAN / barcode',                             es: 'EAN / código de barras' },
    active:           { en: '1 if the record is active',                 es: '1 si el registro está activo' },
    template_id:      { en: 'Product template foreign key',              es: 'Clave foránea de la plantilla de producto' },
    login:            { en: 'Odoo login username',                       es: 'Nombre de usuario en Odoo' },
    email:            { en: 'Email address',                             es: 'Dirección de correo electrónico' },
    external_user:    { en: '1 if the user is an external/portal user',  es: '1 si el usuario es externo/portal' },
};

/** Supported Odoo locales — add entries here to expand language coverage. */
const SUPPORTED_LOCALES: OdooLocale[] = ['en', 'es'];

export function resolveOdooLocale(raw?: string): OdooLocale {
    if (!raw) return 'es';
    const prefix = raw.toLowerCase().split('-')[0].split('_')[0];
    return (SUPPORTED_LOCALES as string[]).includes(prefix)
        ? (prefix as OdooLocale)
        : 'es';
}

/**
 * Applies Odoo-specific localised display_name and description to a tables array
 * generated by DuckDBConnection.generateDataModel().
 * Also stores all available translations in the localized[] array.
 */
export function applyOdooLabels(tables: any[], locale: OdooLocale): void {
    for (const table of tables) {
        const tKey = table.table_name as string;
        const tDefault = TABLE_LABELS[tKey]?.[locale] ?? table.display_name?.default ?? tKey;
        const tDesc    = TABLE_DESCRIPTIONS[tKey]?.[locale] ?? tDefault;

        table.display_name = {
            default: tDefault,
            localized: SUPPORTED_LOCALES
                .filter(l => l !== locale && TABLE_LABELS[tKey]?.[l])
                .map(l => ({ locale: l, value: TABLE_LABELS[tKey][l] }))
        };
        table.description = {
            default: tDesc,
            localized: SUPPORTED_LOCALES
                .filter(l => l !== locale && TABLE_DESCRIPTIONS[tKey]?.[l])
                .map(l => ({ locale: l, value: TABLE_DESCRIPTIONS[tKey][l] }))
        };

        for (const col of table.columns) {
            const cKey     = col.column_name as string;
            const cDefault = COLUMN_LABELS[cKey]?.[locale] ?? col.display_name?.default ?? cKey;
            const cDesc    = COLUMN_DESCRIPTIONS[cKey]?.[locale] ?? cDefault;

            col.display_name = {
                default: cDefault,
                localized: SUPPORTED_LOCALES
                    .filter(l => l !== locale && COLUMN_LABELS[cKey]?.[l])
                    .map(l => ({ locale: l, value: COLUMN_LABELS[cKey][l] }))
            };
            col.description = {
                default: cDesc,
                localized: SUPPORTED_LOCALES
                    .filter(l => l !== locale && COLUMN_DESCRIPTIONS[cKey]?.[l])
                    .map(l => ({ locale: l, value: COLUMN_DESCRIPTIONS[cKey][l] }))
            };

            if (cKey === 'id' || cKey.endsWith('_id')) {
                col.visible = false;
            }

            if (col.column_type === 'numeric') {
                col.minimumFractionDigits = 2;
            }
        }
    }
}
