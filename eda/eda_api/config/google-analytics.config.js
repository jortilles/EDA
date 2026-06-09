/**
 * Google Analytics 4 OAuth2 configuration.
 *
 * Create an OAuth 2.0 client in Google Cloud Console:
 *   https://console.cloud.google.com/apis/credentials
 *
 * Required scopes: https://www.googleapis.com/auth/analytics.readonly
 * Authorized redirect URI must match REDIRECT_URI below.
 *
 * For local development: http://localhost:8080/google-analytics/oauth-callback
 * For production:        https://your-domain.com/google-analytics/oauth-callback
 */
module.exports = {
    CLIENT_ID:     process.env.GA4_CLIENT_ID     || 'XXX',
    CLIENT_SECRET: process.env.GA4_CLIENT_SECRET || 'YYY',
    REDIRECT_URI:  process.env.GA4_REDIRECT_URI  || 'http://localhost:8080/google-analytics/oauth-callback',
};
