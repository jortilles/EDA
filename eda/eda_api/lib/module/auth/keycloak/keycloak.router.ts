
import * as  express from 'express';
import {authKeycloak} from '../../../guards/auth-keycloak';
import { KeycloakController } from './keycloak.controller';

const router = express.Router();


router.post('/login', authKeycloak, KeycloakController.keycloakLogin );

export default router;
