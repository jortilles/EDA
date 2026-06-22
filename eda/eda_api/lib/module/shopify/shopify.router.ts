import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { ShopifyController } from './shopify.controller';

const router = express.Router();

/** Returns the Shopify OAuth authorization URL + a state token. */
router.get('/auth-url', authGuard, roleGuard, ShopifyController.getAuthUrl);

/** Shopify redirects here after user grants consent. No auth guard — called by Shopify. */
router.get('/oauth-callback', ShopifyController.handleOAuthCallback);

/** Frontend polls this until the OAuth callback deposits the access token. */
router.get('/poll-token', authGuard, ShopifyController.pollToken);

/** Trigger a manual data download. */
router.post('/download', authGuard, roleGuard, ShopifyController.downloadData);

export default router;
