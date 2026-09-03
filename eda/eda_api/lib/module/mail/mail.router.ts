import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { MailController } from './mail.controller';
const router = express.Router();

/**
 * @openapi
 * /mail/credentials:
 *   get:
 *     description: Retrieves the current SMTP mail server credentials configured in the system. Requires admin role.
 *     responses:
 *       200:
 *         description: Mail credentials returned successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       403:
 *         description: Forbidden - admin role required.
 *       500:
 *         description: Server error retrieving mail credentials.
 *     tags:
 *       - Mail Routes
 */
router.get('/credentials', authGuard, roleGuard, MailController.getCredentials);

/**
 * @openapi
 * /mail/check:
 *   post:
 *     description: Tests the SMTP connection with the provided credentials. Requires admin role.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             host:
 *               type: string
 *               description: SMTP server hostname
 *             port:
 *               type: integer
 *               description: SMTP server port
 *             user:
 *               type: string
 *               description: SMTP authentication user
 *             password:
 *               type: string
 *               description: SMTP authentication password
 *             secure:
 *               type: boolean
 *               description: Whether to use SSL/TLS
 *     responses:
 *       200:
 *         description: SMTP connection test successful.
 *       400:
 *         description: SMTP connection test failed.
 *       401:
 *         description: Unauthorized - authentication required.
 *       403:
 *         description: Forbidden - admin role required.
 *     tags:
 *       - Mail Routes
 */
router.post('/check', authGuard, roleGuard, MailController.checkCredentials);

/**
 * @openapi
 * /mail/save:
 *   post:
 *     description: Saves the SMTP mail server credentials to the system configuration. Requires admin role.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             host:
 *               type: string
 *               description: SMTP server hostname
 *             port:
 *               type: integer
 *               description: SMTP server port
 *             user:
 *               type: string
 *               description: SMTP authentication user
 *             password:
 *               type: string
 *               description: SMTP authentication password
 *             secure:
 *               type: boolean
 *               description: Whether to use SSL/TLS
 *     responses:
 *       200:
 *         description: Mail credentials saved successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       403:
 *         description: Forbidden - admin role required.
 *       500:
 *         description: Server error saving mail credentials.
 *     tags:
 *       - Mail Routes
 */
router.post('/save', authGuard, roleGuard, MailController.saveCredentials);

/**
 * @openapi
 * /mail/send-dashboard-now:
 *   post:
 *     description: Renders the given dashboard and mails it (PDF + link) to the provided recipients immediately, in the background, without waiting for the scheduled job. Used by the "Enviar" button in the dashboard mail-config dialog.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             dashboardId:
 *               type: string
 *               description: Dashboard to render and send
 *             to:
 *               type: array
 *               items:
 *                 type: string
 *               description: Recipient email address(es)
 *             subject:
 *               type: string
 *               description: Email subject
 *             message:
 *               type: string
 *               description: Email body
 *     responses:
 *       200:
 *         description: Send started.
 *       400:
 *         description: Missing dashboard or recipients.
 *       401:
 *         description: Unauthorized - authentication required.
 *       501:
 *         description: SMTP connection error.
 *     tags:
 *       - Mail Routes
 */
router.post('/send-dashboard-now', authGuard, MailController.sendDashboardNow);

/**
 * @openapi
 * /mail/send-alert-now:
 *   post:
 *     description: Evaluates a KPI alert now and, if its threshold condition holds, mails it to the provided recipients. Used by the "Enviar" button in the KPI mail-config dialog.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             dashboardId:
 *               type: string
 *             panelId:
 *               type: string
 *             operand:
 *               type: string
 *               description: Alert comparison operand (<, >, =)
 *             value:
 *               type: string
 *               description: Alert threshold value
 *             to:
 *               type: array
 *               items:
 *                 type: string
 *             subject:
 *               type: string
 *             message:
 *               type: string
 *     responses:
 *       200:
 *         description: Alert sent (or skipped because the condition did not hold).
 *       400:
 *         description: Missing alert data or recipients.
 *       401:
 *         description: Unauthorized - authentication required.
 *       501:
 *         description: SMTP connection or send error.
 *     tags:
 *       - Mail Routes
 */
router.post('/send-alert-now', authGuard, MailController.sendAlertNow);

/**
 * @openapi
 * /mail/send-now:
 *   post:
 *     description: Immediately sends a dashboard report via email. Requires admin role.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             to:
 *               type: string
 *               description: Recipient email address
 *             subject:
 *               type: string
 *               description: Email subject
 *             dashboardId:
 *               type: string
 *               description: Dashboard ID to include in the report
 *     responses:
 *       200:
 *         description: Email sent successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       403:
 *         description: Forbidden - admin role required.
 *       500:
 *         description: Server error sending email.
 *     tags:
 *       - Mail Routes
 */
router.post('/send-now', authGuard, roleGuard, MailController.sendNow);

export default router;