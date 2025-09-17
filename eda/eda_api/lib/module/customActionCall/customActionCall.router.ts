import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { CustomActionCallController } from './customActionCall.controller';

const router = express.Router();

router.post('/check', authGuard, roleGuard, CustomActionCallController.checkUrl);

export default router;