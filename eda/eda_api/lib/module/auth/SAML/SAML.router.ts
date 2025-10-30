import * as  express from 'express';

import { authGuard } from '../../../guards/auth-guard';

import { SAMLController } from './SAML.controller';

const router = express.Router();

// Botón Login "Single Sing-On" con SAML => Redirige al login del Entity Provider
router.get('/login', SAMLController.login);

// Respuesta del login del Entity Provider
router.post('/acs', express.urlencoded({ extended: false }), SAMLController.acs);

// Control de metadata
router.get('/metadata', SAMLController.metadata);

// Botón Logout "single Sign-On" con SAML => Redirige petición de logout al Idp
router.get('/logout', authGuard ,SAMLController.logout); // SP-initiated logout: redirige al IdP

// Endpoint para recibir la respuesta/requests del IdP (GET o POST según el binding)
router.post('/sls', express.urlencoded({ extended: false }), SAMLController.sls);

export default router;