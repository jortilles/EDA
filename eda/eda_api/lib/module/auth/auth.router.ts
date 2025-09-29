
import express from 'express';

// Opciones de autenticaciones
import SAMLRouter from './SAML/SAML.router';
import SAML_ORCL_Router from './SAML_ORCL/SAML_ORCL.router';

const router = express.Router();

// Autenticación con SAML
router.use('/saml', SAMLRouter);

// Autenticación con SAML y bbdd oracle para la autorización
router.use('/samlorcl', SAML_ORCL_Router);

export default router;