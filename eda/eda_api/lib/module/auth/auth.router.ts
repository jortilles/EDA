
import express from 'express';

// Opciones de autenticaciones
import SAMLRouter from './SAML/SAML.router';

const router = express.Router();

// Autenticación con SAML
router.use('/saml', SAMLRouter);


export default router;