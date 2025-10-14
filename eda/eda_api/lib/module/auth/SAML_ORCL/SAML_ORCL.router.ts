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


export default router;