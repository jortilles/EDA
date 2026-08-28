import * as  express from 'express';
import { authGuard } from '../../../guards/auth-guard';
import { roleGuard } from '../../../guards/role-guard';
import { LogController } from './log.controller';
import { AuditLogController } from './audit-log.controller';
const router = express.Router();

/**
 * @openapi
 * /admin/log-file:
 *   get:
 *     description: Returns the current application access log file content. Requires admin authentication.
 *     responses:
 *       200:
 *         description: Log file content returned successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       403:
 *         description: Forbidden - admin role required.
 *       500:
 *         description: Server error reading the log file.
 *     tags:
 *       - Admin Log Routes
 */
router.get('/log-file', [authGuard, roleGuard], LogController.getLogFile);

/**
 * @openapi
 * /admin/log-error-file:
 *   get:
 *     description: Returns the current application error log file content. Requires admin authentication.
 *     responses:
 *       200:
 *         description: Error log file content returned successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       403:
 *         description: Forbidden - admin role required.
 *       500:
 *         description: Server error reading the error log file.
 *     tags:
 *       - Admin Log Routes
 */
router.get('/log-error-file', [authGuard, roleGuard], LogController.getLogErrorFile);

/**
 * @openapi
 * /admin/log/app-logs:
 *   get:
 *     description: Returns structured audit log entries (login, dashboard/user actions, query failures), optionally filtered by date/startDate/endDate/limit. Requires admin authentication.
 *     responses:
 *       200:
 *         description: Audit log entries returned successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       403:
 *         description: Forbidden - admin role required.
 *     tags:
 *       - Admin Log Routes
 */
router.get('/app-logs', [authGuard, roleGuard], AuditLogController.getAppLogs);

/**
 * @openapi
 * /admin/log/log-tail:
 *   get:
 *     description: Returns the bytes appended to the access or error log file since the given offset, for incremental read-only polling. Requires admin authentication.
 *     responses:
 *       200:
 *         description: New log content, next offset, current file size, and a reset flag returned successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       403:
 *         description: Forbidden - admin role required.
 *     tags:
 *       - Admin Log Routes
 */
router.get('/log-tail', [authGuard, roleGuard], LogController.getLogTail);


export default router;
