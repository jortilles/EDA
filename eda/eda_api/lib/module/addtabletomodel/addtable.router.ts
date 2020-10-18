import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { AddTableController } from './addtable.controller';

const router = express.Router();

router.post('/create', authGuard, AddTableController.createTable);
router.post('/insert', authGuard, AddTableController.insertToTable);

export default router;