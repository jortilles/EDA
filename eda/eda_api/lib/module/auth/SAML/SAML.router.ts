import * as  express from 'express';

import { authGuard } from '../../../guards/auth-guard';
import { roleGuard } from '../../../guards/role-guard';
import {originGuard} from '../../../guards/origin-guard';

import { SAMLController } from './SAML.controller';

const router = express.Router();

router.get('/login', SAMLController.login);

export default router;