export type ShopifyLocale = 'en' | 'es';

const TABLE_LABELS: Record<string, Record<ShopifyLocale, string>> = {
    orders:      { en: 'Orders',       es: 'Pedidos' },
    order_lines: { en: 'Order Lines',  es: 'Líneas de Pedido' },
    customers:   { en: 'Customers',    es: 'Clientes' },
    products:    { en: 'Products',     es: 'Productos' },
    variants:    { en: 'Variants',     es: 'Variantes' },
};

const TABLE_DESCRIPTIONS: Record<string, Record<ShopifyLocale, string>> = {
    orders:      { en: 'Shopify orders and their summary',           es: 'Pedidos de Shopify y su resumen' },
    order_lines: { en: 'Line items detail for each order',           es: 'Líneas de detalle de cada pedido' },
    customers:   { en: 'Customers registered in the Shopify store',  es: 'Clientes registrados en la tienda Shopify' },
    products:    { en: 'Product catalogue from Shopify',             es: 'Catálogo de productos de Shopify' },
    variants:    { en: 'Product variants (SKU, price, stock)',        es: 'Variantes de producto (SKU, precio, stock)' },
};

const COLUMN_LABELS: Record<string, Record<ShopifyLocale, string>> = {
    // shared
    id:                  { en: 'ID',                    es: 'ID' },
    title:               { en: 'Title',                 es: 'Título' },
    status:              { en: 'Status',                es: 'Estado' },
    created_at:          { en: 'Created At',            es: 'Fecha Creación' },
    price:               { en: 'Price',                 es: 'Precio' },
    sku:                 { en: 'SKU',                   es: 'SKU' },
    vendor:              { en: 'Vendor',                es: 'Proveedor' },
    quantity:            { en: 'Quantity',              es: 'Cantidad' },
    currency:            { en: 'Currency',              es: 'Divisa' },
    tags:                { en: 'Tags',                  es: 'Etiquetas' },

    // orders
    order_number:        { en: 'Order Number',          es: 'Número de Pedido' },
    processed_at:        { en: 'Processed At',          es: 'Fecha Procesado' },
    customer_id:         { en: 'Customer ID',           es: 'ID Cliente' },
    financial_status:    { en: 'Financial Status',      es: 'Estado Financiero' },
    fulfillment_status:  { en: 'Fulfillment Status',    es: 'Estado Envío' },
    subtotal_price:      { en: 'Subtotal',              es: 'Subtotal' },
    total_discounts:     { en: 'Total Discounts',       es: 'Total Descuentos' },
    total_tax:           { en: 'Total Tax',             es: 'Total Impuestos' },
    total_price:         { en: 'Total',                 es: 'Total' },

    // order_lines
    order_id:            { en: 'Order ID',              es: 'ID Pedido' },
    product_id:          { en: 'Product ID',            es: 'ID Producto' },
    variant_id:          { en: 'Variant ID',            es: 'ID Variante' },
    total_discount:      { en: 'Line Discount',         es: 'Descuento Línea' },

    // customers
    email:               { en: 'Email',                 es: 'Email' },
    first_name:          { en: 'First Name',            es: 'Nombre' },
    last_name:           { en: 'Last Name',             es: 'Apellidos' },
    phone:               { en: 'Phone',                 es: 'Teléfono' },
    city:                { en: 'City',                  es: 'Ciudad' },
    province:            { en: 'Province',              es: 'Provincia' },
    country:             { en: 'Country',               es: 'País' },
    orders_count:        { en: 'Orders Count',          es: 'Nº Pedidos' },
    total_spent:         { en: 'Total Spent',           es: 'Total Gastado' },

    // products
    product_type:        { en: 'Product Type',          es: 'Tipo de Producto' },

    // variants
    compare_at_price:    { en: 'Compare At Price',      es: 'Precio Comparación' },
    inventory_quantity:  { en: 'Stock',                 es: 'Stock' },
};

const COLUMN_DESCRIPTIONS: Record<string, Record<ShopifyLocale, string>> = {
    id:                  { en: 'Shopify internal record identifier',            es: 'Identificador interno de registro en Shopify' },
    order_number:        { en: 'Human-readable order number',                  es: 'Número de pedido legible' },
    created_at:          { en: 'Record creation date',                         es: 'Fecha de creación del registro' },
    processed_at:        { en: 'Date the order was processed',                 es: 'Fecha en que se procesó el pedido' },
    customer_id:         { en: 'Customer foreign key → customers.id',          es: 'Clave foránea de cliente → customers.id' },
    financial_status:    { en: 'Payment status (paid, pending, refunded...)',   es: 'Estado de pago (paid, pending, refunded...)' },
    fulfillment_status:  { en: 'Shipping status (fulfilled, unfulfilled...)',   es: 'Estado de envío (fulfilled, unfulfilled...)' },
    subtotal_price:      { en: 'Order subtotal before taxes and shipping',      es: 'Subtotal del pedido antes de impuestos y envío' },
    total_discounts:     { en: 'Total discount applied to the order',          es: 'Descuento total aplicado al pedido' },
    total_tax:           { en: 'Total taxes amount',                           es: 'Importe total de impuestos' },
    total_price:         { en: 'Order total including taxes and shipping',      es: 'Total del pedido con impuestos y envío' },
    currency:            { en: 'Currency code (ISO 4217)',                     es: 'Código de divisa (ISO 4217)' },
    order_id:            { en: 'Order foreign key → orders.id',                es: 'Clave foránea de pedido → orders.id' },
    product_id:          { en: 'Product foreign key → products.id',            es: 'Clave foránea de producto → products.id' },
    variant_id:          { en: 'Variant foreign key → variants.id',            es: 'Clave foránea de variante → variants.id' },
    title:               { en: 'Display title',                                es: 'Título de visualización' },
    sku:                 { en: 'Stock keeping unit code',                      es: 'Código de referencia de stock' },
    quantity:            { en: 'Number of units ordered',                      es: 'Número de unidades pedidas' },
    price:               { en: 'Unit price at time of purchase',               es: 'Precio unitario en el momento de la compra' },
    total_discount:      { en: 'Discount applied to this line item',           es: 'Descuento aplicado a esta línea' },
    vendor:              { en: 'Product vendor or supplier',                   es: 'Proveedor o fabricante del producto' },
    email:               { en: 'Customer email address',                       es: 'Dirección de correo del cliente' },
    first_name:          { en: 'Customer first name',                          es: 'Nombre del cliente' },
    last_name:           { en: 'Customer last name',                           es: 'Apellidos del cliente' },
    phone:               { en: 'Phone number',                                 es: 'Número de teléfono' },
    city:                { en: 'City from default address',                    es: 'Ciudad de la dirección principal' },
    province:            { en: 'Province or state',                            es: 'Provincia o estado' },
    country:             { en: 'Country from default address',                 es: 'País de la dirección principal' },
    orders_count:        { en: 'Total number of orders placed',                es: 'Número total de pedidos realizados' },
    total_spent:         { en: 'Total amount spent by the customer',           es: 'Importe total gastado por el cliente' },
    product_type:        { en: 'Product category type defined in Shopify',     es: 'Tipo de categoría de producto definido en Shopify' },
    status:              { en: 'Product status (active, archived, draft)',      es: 'Estado del producto (active, archived, draft)' },
    tags:                { en: 'Comma-separated product tags',                 es: 'Etiquetas del producto separadas por comas' },
    compare_at_price:    { en: 'Original price before discount',               es: 'Precio original antes del descuento' },
    inventory_quantity:  { en: 'Units available in inventory',                 es: 'Unidades disponibles en inventario' },
};

const SUPPORTED_LOCALES: ShopifyLocale[] = ['en', 'es'];

export function resolveShopifyLocale(raw?: string): ShopifyLocale {
    if (!raw) return 'es';
    const prefix = raw.toLowerCase().split('-')[0].split('_')[0];
    return (SUPPORTED_LOCALES as string[]).includes(prefix)
        ? (prefix as ShopifyLocale)
        : 'es';
}

export function applyShopifyLabels(tables: any[], locale: ShopifyLocale): void {
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
