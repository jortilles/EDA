
import * as  express from 'express';
import { authGuard } from '../../../guards/auth-guard';
import { roleGuard } from '../../../guards/role-guard';
import { originGuard } from '../../../guards/origin-guard';
import { LogController } from './log.controller';
// SDA CUSTOM - Import SDA audit log controller (app-logs endpoint)
import { LogSdaController } from './log-sda.controller';
// END SDA CUSTOM
const router = express.Router();

router.get('/log-file', [authGuard, roleGuard], LogController.getLogFile);

router.get('/log-error-file', [authGuard, roleGuard], LogController.getLogErrorFile);

// SDA CUSTOM - Endpoint for SDA audit log viewer
router.get('/app-logs', [authGuard, roleGuard], LogSdaController.getAppLogs);
// END SDA CUSTOM


export default router;
