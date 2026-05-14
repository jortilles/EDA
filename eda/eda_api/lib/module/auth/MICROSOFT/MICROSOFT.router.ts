import * as  express from 'express';
import { MicrosoftController } from './MICROSOFT.controller';

const router = express.Router();

/**
 * @openapi
 * /auth/microsoft/login:
 *   post:
 *     description: Authenticates a user via Microsoft Azure AD Single Sign-On (SSO). Validates the Microsoft access token and returns an EDA JWT session token.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               description: Microsoft Azure AD access token obtained from the MSAL authentication flow
 *     responses:
 *       200:
 *         description: Microsoft SSO authentication successful, EDA JWT token returned.
 *       400:
 *         description: Invalid Microsoft token or user not authorized in EDA.
 *       500:
 *         description: Server error during Microsoft SSO authentication.
 *     tags:
 *       - Authentication Routes
 */
router.post('/login', MicrosoftController.login);


export default router;