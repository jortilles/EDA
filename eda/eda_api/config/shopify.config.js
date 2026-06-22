/**
 * Shopify OAuth configuration.
 *
 * Create a Custom App in your Shopify Partners Dev Dashboard:
 *   https://partners.shopify.com
 *
 * Required scopes: read_orders, read_customers, read_products, read_inventory
 * Authorized redirect URI must match REDIRECT_URI below.
 *
 * For local development: http://localhost:8080/shopify/oauth-callback
 * For production:        https://your-domain.com/shopify/oauth-callback
 */
module.exports = {
    CLIENT_ID:     process.env.SHOPIFY_CLIENT_ID     || 'XXX',
    CLIENT_SECRET: process.env.SHOPIFY_CLIENT_SECRET || 'YYY',
    REDIRECT_URI:  process.env.SHOPIFY_REDIRECT_URI  || 'http://localhost:8666/shopify/oauth-callback',
    SCOPES:        process.env.SHOPIFY_SCOPES        || 'read_orders,read_customers,read_products,read_inventory',
};
