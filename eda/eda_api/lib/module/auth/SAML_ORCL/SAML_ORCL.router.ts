import * as  express from 'express';
import { authGuard } from '../../../guards/auth-guard';
import { SAML_ORCL_Controller } from './SAML_ORCL.controller';

const router = express.Router();

/**
 * @openapi
 * /auth/saml/login:
 *   get:
 *     description: Initiates the SAML SSO login flow (Oracle DB authorization variant) by redirecting the user to the configured Identity Provider (IdP) login page.
 *     responses:
 *       302:
 *         description: Redirect to the SAML Identity Provider login URL.
 *       500:
 *         description: Server error initiating SAML login.
 *     tags:
 *       - Authentication Routes
 */
router.get('/login', SAML_ORCL_Controller.login);

/**
 * @openapi
 * /auth/saml/acs:
 *   post:
 *     description: ACS endpoint for SAML with Oracle DB authorization. Processes the SAML assertion and checks user authorization against an Oracle database.
 *     parameters:
 *       - name: SAMLResponse
 *         in: formData
 *         required: true
 *         type: string
 *         description: Base64-encoded SAML response from the Identity Provider
 *     responses:
 *       302:
 *         description: Redirect to the EDA application with session token upon successful authentication and Oracle authorization.
 *       400:
 *         description: Invalid SAML assertion or user not authorized in Oracle DB.
 *       500:
 *         description: Server error processing SAML assertion or Oracle DB lookup.
 *     tags:
 *       - Authentication Routes
 */
router.post('/acs', express.urlencoded({ extended: false }), SAML_ORCL_Controller.acs);

/**
 * @openapi
 * /auth/saml/metadata:
 *   get:
 *     description: Returns the SAML SP metadata XML for the Oracle authorization variant.
 *     responses:
 *       200:
 *         description: SAML SP metadata XML returned successfully.
 *       500:
 *         description: Server error generating SAML metadata.
 *     tags:
 *       - Authentication Routes
 */
router.get('/metadata', SAML_ORCL_Controller.metadata);

/**
 * @openapi
 * /auth/saml/request-logout:
 *   get:
 *     description: Initiates the SAML SLO flow for the Oracle authorization variant. Requires authentication.
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
router.get('/request-logout', authGuard ,SAML_ORCL_Controller.requestLogout);

/**
 * @openapi
 * /auth/saml/logout:
 *   get:
 *     description: Receives the SAML logout response from the Identity Provider (GET binding) for the Oracle authorization variant.
 *     responses:
 *       302:
 *         description: Redirect to the EDA login page after successful logout.
 *       500:
 *         description: Server error processing SAML logout.
 *     tags:
 *       - Authentication Routes
 *   post:
 *     description: Receives the SAML logout response from the Identity Provider (POST binding) for the Oracle authorization variant.
 *     parameters:
 *       - name: SAMLResponse
 *         in: formData
 *         type: string
 *         description: Base64-encoded SAML logout response
 *     responses:
 *       302:
 *         description: Redirect to the EDA login page after successful logout.
 *       500:
 *         description: Server error processing SAML logout.
 *     tags:
 *       - Authentication Routes
 */
router.route('/logout')
  .get(express.urlencoded({ extended: false }), SAML_ORCL_Controller.logout)
  .post(express.urlencoded({ extended: false }), SAML_ORCL_Controller.logout);


export default router;