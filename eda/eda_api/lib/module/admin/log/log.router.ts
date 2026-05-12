import * as  express from 'express';
import { authGuard } from '../../../guards/auth-guard';
import { roleGuard } from '../../../guards/role-guard';
import {originGuard} from '../../../guards/origin-guard';
import { LogController } from './log.controller';
const router = express.Router();

/**
 * @openapi
 * /admin/log-file:
 *   get:
 *     description: Returns the current application access log file content. Requires authentication.
 *     responses:
 *       200:
 *         description: Log file content returned successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       500:
 *         description: Server error reading the log file.
 *     tags:
 *       - Admin Log Routes
 */
router.get('/log-file', authGuard,  LogController.getLogFile);

/**
 * @openapi
 * /admin/log-error-file:
 *   get:
 *     description: Returns the current application error log file content. Requires authentication.
 *     responses:
 *       200:
 *         description: Error log file content returned successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       500:
 *         description: Server error reading the error log file.
 *     tags:
 *       - Admin Log Routes
 */
router.get('/log-error-file',  authGuard,   LogController.getLogErrorFile);


export default router;