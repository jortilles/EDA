
import * as  express from 'express';
// import { authGuard } from '../../../guards/auth-guard';
// import { roleGuard } from '../../../guards/role-guard';
// import {originGuard} from '../../../guards/origin-guard';
import { MicrosoftController } from './microsoft.controller';

const router = express.Router();

// Routes -> /auth/microsoft

router.post('/login', MicrosoftController.credentialMicrosoft);

export default router;
