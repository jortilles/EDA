import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { GoogleAnalyticsController } from './google-analytics.controller';

const router = express.Router();

router.post('/add-data-source', authGuard, roleGuard, GoogleAnalyticsController.addDataSource);

/** Returns the Google OAuth2 authorization URL + a state token. */
router.get('/auth-url', authGuard, roleGuard, GoogleAnalyticsController.getAuthUrl);

/** Google redirects here after user grants consent. No auth guard — called by Google. */
router.get('/oauth-callback', GoogleAnalyticsController.handleOAuthCallback);

/** Frontend polls this until the OAuth callback deposits the refresh token. */
router.get('/poll-token', authGuard, GoogleAnalyticsController.pollToken);

/** Trigger a manual data download. */
router.post('/download-report', authGuard, roleGuard, GoogleAnalyticsController.downloadReport);

export default router;
