import * as  express from 'express';

import { authGuard } from '../../../guards/auth-guard';

import { SAMLController } from './SAML.controller';

const router = express.Router();

router.get('/login', SAMLController.login);

router.post('/acs', express.urlencoded({ extended: false }), SAMLController.acs);

router.get('/metadata', SAMLController.metadata);


export default router;