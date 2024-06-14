
import express from 'express';
import KeycloakRouter from './keycloak/keycloak.router';

const router = express.Router();

router.use('/kc', KeycloakRouter);

export default router;