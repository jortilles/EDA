import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { AddTableController } from './addtable.controller';

const router = express.Router();

router.post('/create', authGuard, roleGuard, AddTableController.createTable);
router.post('/insert', authGuard, roleGuard, AddTableController.insertToTable);

export default router;