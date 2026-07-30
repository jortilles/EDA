export type HoldedLocale = 'en' | 'es';

const TABLE_LABELS: Record<string, Record<HoldedLocale, string>> = {
    invoices:      { en: 'Invoices',          es: 'Facturas' },
    invoice_lines: { en: 'Invoice Lines',     es: 'Líneas de Factura' },
    contacts:      { en: 'Contacts',          es: 'Contactos' },
    products:      { en: 'Products',          es: 'Productos' },
    ledger:        { en: 'Ledger',            es: 'Asientos Contables' },
};

const TABLE_DESCRIPTIONS: Record<string, Record<HoldedLocale, string>> = {
    invoices:      { en: 'Holded invoices and their summary',               es: 'Facturas de Holded y su resumen' },
    invoice_lines: { en: 'Line items detail for each invoice',              es: 'Líneas de detalle de cada factura' },
    contacts:      { en: 'Customers and suppliers from Holded',             es: 'Clientes y proveedores de Holded' },
    products:      { en: 'Product catalogue from Holded',                   es: 'Catálogo de productos de Holded' },
    ledger:        { en: 'Daily accounting ledger entries',                 es: 'Asientos del libro diario contable' },
};

const COLUMN_LABELS: Record<string, Record<HoldedLocale, string>> = {
    // shared
    id:             { en: 'ID',                 es: 'ID' },
    name:           { en: 'Name',               es: 'Nombre' },
    type:           { en: 'Type',               es: 'Tipo' },
    subtotal:       { en: 'Subtotal',           es: 'Subtotal' },
    total:          { en: 'Total',              es: 'Total' },
    discount:       { en: 'Discount',           es: 'Descuento' },
    taxes:          { en: 'Taxes',              es: 'Impuestos' },
    status:         { en: 'Status',             es: 'Estado' },
    currency:       { en: 'Currency',           es: 'Divisa' },
    description:    { en: 'Description',        es: 'Descripción' },
    sku:            { en: 'SKU',                es: 'SKU' },
    category:       { en: 'Category',           es: 'Categoría' },
    category_id:    { en: 'Category ID',        es: 'ID Categoría' },
    email:          { en: 'Email',              es: 'Email' },
    phone:          { en: 'Phone',              es: 'Teléfono' },
    mobile:         { en: 'Mobile',             es: 'Móvil' },
    country:        { en: 'Country',            es: 'País' },
    vat:            { en: 'VAT Number',         es: 'NIF' },

    // invoices
    number:         { en: 'Number',             es: 'Número' },
    date:           { en: 'Date',               es: 'Fecha' },
    due_date:       { en: 'Due Date',           es: 'Fecha Vencimiento' },
    contact_id:     { en: 'Contact ID',         es: 'ID Contacto' },
    contact:        { en: 'Contact',            es: 'Contacto' },
    contact_code:   { en: 'Contact Code',       es: 'Código Contacto' },
    exchange_rate:  { en: 'Exchange Rate',      es: 'Tipo de Cambio' },
    paid:           { en: 'Paid',               es: 'Pagado' },
    pending:        { en: 'Pending',            es: 'Pendiente' },

    // invoice_lines
    invoice_id:     { en: 'Invoice ID',         es: 'ID Factura' },
    product_id:     { en: 'Product ID',         es: 'ID Producto' },
    quantity:       { en: 'Quantity',           es: 'Unidades' },
    unit_price:     { en: 'Unit Price',         es: 'Precio Unitario' },
    tax_pct:        { en: 'Tax %',              es: 'Impuesto %' },

    // contacts
    code:           { en: 'Code',               es: 'Código' },
    trade_name:     { en: 'Trade Name',         es: 'Nombre Comercial' },

    // products
    price:          { en: 'Price',              es: 'Precio' },
    cost:           { en: 'Cost',               es: 'Coste' },

    // ledger
    account:        { en: 'Account',            es: 'Cuenta' },
    account_name:   { en: 'Account Name',       es: 'Nombre Cuenta' },
    debit:          { en: 'Debit',              es: 'Debe' },
    credit:         { en: 'Credit',             es: 'Haber' },
    document_id:    { en: 'Document ID',        es: 'ID Documento' },
};

const COLUMN_DESCRIPTIONS: Record<string, Record<HoldedLocale, string>> = {
    id:             { en: 'Holded internal record identifier',              es: 'Identificador interno de registro en Holded' },
    number:         { en: 'Invoice or document number',                     es: 'Número de factura o documento' },
    date:           { en: 'Date of the record',                             es: 'Fecha del registro' },
    due_date:       { en: 'Payment due date',                               es: 'Fecha límite de pago' },
    contact_id:     { en: 'Contact foreign key → contacts.id',             es: 'Clave foránea de contacto → contacts.id' },
    contact:        { en: 'Contact display name',                           es: 'Nombre del contacto' },
    contact_code:   { en: 'Contact short code',                             es: 'Código corto del contacto' },
    currency:       { en: 'Invoice currency code',                          es: 'Código de la divisa de la factura' },
    exchange_rate:  { en: 'Currency exchange rate vs. base currency',       es: 'Tipo de cambio respecto a la moneda base' },
    subtotal:       { en: 'Amount before taxes and discounts',              es: 'Importe antes de impuestos y descuentos' },
    discount:       { en: 'Discount amount or percentage',                  es: 'Importe o porcentaje de descuento' },
    taxes:          { en: 'Total taxes amount',                             es: 'Importe total de impuestos' },
    total:          { en: 'Total amount including taxes',                   es: 'Importe total con impuestos' },
    status:         { en: 'Document status code',                           es: 'Código de estado del documento' },
    paid:           { en: 'Amount already paid',                            es: 'Importe ya pagado' },
    pending:        { en: 'Amount still pending payment',                   es: 'Importe pendiente de pago' },
    invoice_id:     { en: 'Invoice foreign key → invoices.id',             es: 'Clave foránea de factura → invoices.id' },
    product_id:     { en: 'Product foreign key → products.id',             es: 'Clave foránea de producto → products.id' },
    name:           { en: 'Display name',                                   es: 'Nombre de visualización' },
    sku:            { en: 'Stock keeping unit code',                        es: 'Código de referencia de stock' },
    quantity:       { en: 'Quantity of units',                              es: 'Cantidad de unidades' },
    unit_price:     { en: 'Price per unit before discounts',                es: 'Precio por unidad antes de descuentos' },
    tax_pct:        { en: 'Applicable tax percentage',                      es: 'Porcentaje de impuesto aplicable' },
    type:           { en: 'Record type or kind',                            es: 'Tipo o clase de registro' },
    code:           { en: 'Short identification code',                      es: 'Código de identificación corto' },
    trade_name:     { en: 'Commercial or trade name',                       es: 'Nombre comercial' },
    email:          { en: 'Email address',                                  es: 'Dirección de correo electrónico' },
    phone:          { en: 'Phone number',                                   es: 'Número de teléfono' },
    mobile:         { en: 'Mobile phone number',                            es: 'Número de móvil' },
    vat:            { en: 'VAT / tax identification number',                es: 'NIF / número de identificación fiscal' },
    country:        { en: 'Country name or code',                           es: 'Nombre o código del país' },
    description:    { en: 'Free-text description',                          es: 'Descripción en texto libre' },
    price:          { en: 'Sale price',                                     es: 'Precio de venta' },
    cost:           { en: 'Cost price',                                     es: 'Precio de coste' },
    category_id:    { en: 'Product category foreign key',                   es: 'Clave foránea de categoría' },
    category:       { en: 'Product category name',                          es: 'Nombre de categoría de producto' },
    account:        { en: 'Accounting account code',                        es: 'Código de cuenta contable' },
    account_name:   { en: 'Accounting account name',                        es: 'Nombre de cuenta contable' },
    debit:          { en: 'Debit amount',                                   es: 'Importe al debe' },
    credit:         { en: 'Credit amount',                                  es: 'Importe al haber' },
    document_id:    { en: 'Related document (invoice) foreign key',         es: 'Clave foránea del documento (factura) relacionado' },
};

const SUPPORTED_LOCALES: HoldedLocale[] = ['en', 'es'];

export function resolveHoldedLocale(raw?: string): HoldedLocale {
    if (!raw) return 'es';
    const prefix = raw.toLowerCase().split('-')[0].split('_')[0];
    return (SUPPORTED_LOCALES as string[]).includes(prefix)
        ? (prefix as HoldedLocale)
        : 'es';
}

export function applyHoldedLabels(tables: any[], locale: HoldedLocale): void {
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
        }
    }
}
