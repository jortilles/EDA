
import * as  express from 'express';
import { authGuard } from '../../../guards/auth-guard';
import { roleGuard } from '../../../guards/role-guard';
import {originGuard} from '../../../guards/origin-guard';
import { LogController } from './log.controller';
const router = express.Router();

router.get('/log-file', authGuard,  LogController.getLogFile);

router.get('/log-error-file',  authGuard,   LogController.getLogErrorFile);


export default router;
