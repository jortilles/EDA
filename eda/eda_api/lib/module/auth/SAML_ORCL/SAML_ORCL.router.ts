import * as  express from 'express';
import { authGuard } from '../../../guards/auth-guard';
import { SAML_ORCL_Controller } from './SAML_ORCL.controller';

const router = express.Router();


// Botón Login "Single Sing-On" con SAML => Redirige al login del Entity Provider
router.get('/login', SAML_ORCL_Controller.login);

// Respuesta del login del Entity Provider
router.post('/acs', express.urlencoded({ extended: false }), SAML_ORCL_Controller.acs);

// Control de metadata
router.get('/metadata', SAML_ORCL_Controller.metadata);

// Botón Logout "single Sign-On" con SAML => Redirige petición de logout al Idp
router.get('/request-logout', authGuard ,SAML_ORCL_Controller.requestLogout);

// Endpoint para recibir la respuesta/requests del IdP (GET o POST según el binding)
router.route('/logout')
  .get(express.urlencoded({ extended: false }), SAML_ORCL_Controller.logout)
  .post(express.urlencoded({ extended: false }), SAML_ORCL_Controller.logout);


export default router;