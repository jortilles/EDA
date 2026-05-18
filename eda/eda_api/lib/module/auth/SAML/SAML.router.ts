import * as  express from 'express';
import { authGuard } from '../../../guards/auth-guard';
import { SAMLController } from './SAML.controller';

const router = express.Router();

/**
 * @openapi
 * /auth/saml/login:
 *   get:
 *     description: Initiates the SAML SSO login flow by redirecting the user to the configured Identity Provider (IdP) login page.
 *     responses:
 *       302:
 *         description: Redirect to the SAML Identity Provider login URL.
 *       500:
 *         description: Server error initiating SAML login.
 *     tags:
 *       - Authentication Routes
 */
router.get('/login', SAMLController.login);

/**
 * @openapi
 * /auth/saml/acs:
 *   post:
 *     description: Assertion Consumer Service (ACS) endpoint. Receives and processes the SAML assertion from the Identity Provider after successful authentication.
 *     parameters:
 *       - name: SAMLResponse
 *         in: formData
 *         required: true
 *         type: string
 *         description: Base64-encoded SAML response from the Identity Provider
 *     responses:
 *       302:
 *         description: Redirect to the EDA application with the session token upon successful SAML assertion.
 *       400:
 *         description: Invalid or expired SAML assertion.
 *       500:
 *         description: Server error processing SAML assertion.
 *     tags:
 *       - Authentication Routes
 */
router.post('/acs', express.urlencoded({ extended: false }), SAMLController.acs);

/**
 * @openapi
 * /auth/saml/metadata:
 *   get:
 *     description: Returns the SAML Service Provider (SP) metadata XML. Used by the Identity Provider to configure the trust relationship.
 *     responses:
 *       200:
 *         description: SAML SP metadata XML returned successfully.
 *       500:
 *         description: Server error generating SAML metadata.
 *     tags:
 *       - Authentication Routes
 */
router.get('/metadata', SAMLController.metadata);

/**
 * @openapi
 * /auth/saml/request-logout:
 *   get:
 *     description: Initiates the SAML Single Logout (SLO) flow by sending a logout request to the Identity Provider. Requires authentication.
 *     responses:
 *       302:
 *         description: Redirect to the Identity Provider logout URL.
 *       401:
 *         description: Unauthorized - authentication required.
 *       500:
 *         description: Server error initiating SAML logout.
 *     tags:
 *       - Authentication Routes
 */
router.get('/request-logout', authGuard ,SAMLController.requestLogout);

/**
 * @openapi
 * /auth/saml/logout:
 *   get:
 *     description: Receives and processes the SAML logout response or request from the Identity Provider (GET binding).
 *     responses:
 *       302:
 *         description: Redirect to the EDA application login page after successful logout.
 *       500:
 *         description: Server error processing SAML logout.
 *     tags:
 *       - Authentication Routes
 *   post:
 *     description: Receives and processes the SAML logout response or request from the Identity Provider (POST binding).
 *     parameters:
 *       - name: SAMLResponse
 *         in: formData
 *         type: string
 *         description: Base64-encoded SAML logout response from the Identity Provider
 *     responses:
 *       302:
 *         description: Redirect to the EDA application login page after successful logout.
 *       500:
 *         description: Server error processing SAML logout.
 *     tags:
 *       - Authentication Routes
 */
router.route('/logout')
  .get(express.urlencoded({ extended: false }), SAMLController.logout)
  .post(express.urlencoded({ extended: false }), SAMLController.logout);


export default router;