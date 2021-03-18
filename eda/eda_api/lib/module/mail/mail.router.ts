import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { MailController } from './mail.controller';
const router = express.Router();

router.get('/credentials', authGuard, roleGuard, MailController.getCredentials);
router.post('/check', authGuard, roleGuard, MailController.checkCredentials);
router.post('/save', authGuard, roleGuard, MailController.saveCredentials);

export default router;