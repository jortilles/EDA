import * as  express from 'express';
import { GoogleController } from './GOOGLE.controller';

const router = express.Router();

/**
 * @openapi
 * /auth/google/login:
 *   post:
 *     description: Authenticates a user via Google Single Sign-On (SSO). Validates the Google ID token and returns an EDA JWT session token.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               description: Google OAuth2 ID token obtained from the Google Sign-In flow
 *     responses:
 *       200:
 *         description: Google SSO authentication successful, EDA JWT token returned.
 *       400:
 *         description: Invalid Google token or user not authorized in EDA.
 *       500:
 *         description: Server error during Google SSO authentication.
 *     tags:
 *       - Authentication Routes
 */
router.post('/login', GoogleController.login);


export default router;