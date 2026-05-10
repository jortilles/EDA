import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { NlToSqlController } from './nl-to-sql.controller';

const router = express.Router();

router.post('/generate', authGuard, NlToSqlController.generateSql);
router.get('/available', authGuard, NlToSqlController.availableNlToSql);

export default router;
