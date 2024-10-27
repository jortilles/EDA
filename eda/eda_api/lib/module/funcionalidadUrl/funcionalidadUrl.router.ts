import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { FuncionalidadUrlController } from './funcionalidadUrl.controller';

const router = express.Router();

router.post('/check', authGuard, roleGuard, FuncionalidadUrlController.checkUrl);

export default router;