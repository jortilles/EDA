import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { CustomActionCallController } from './customActionCall.controller';

const router = express.Router();

/**
 * @openapi
 * /customActionCall/check:
 *   post:
 *     description: Validates and tests a custom action URL endpoint to verify it is reachable and returns a valid response. Requires admin role.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *               description: The URL of the custom action endpoint to test
 *             method:
 *               type: string
 *               description: HTTP method to use for the test (GET, POST, etc.)
 *             headers:
 *               type: object
 *               description: Optional HTTP headers to include in the test request
 *     responses:
 *       200:
 *         description: Custom action URL is reachable and returned a valid response.
 *       400:
 *         description: Custom action URL is not reachable or returned an error.
 *       401:
 *         description: Unauthorized - authentication required.
 *       403:
 *         description: Forbidden - admin role required.
 *       500:
 *         description: Server error testing the custom action URL.
 *     tags:
 *       - Custom Action Routes
 */
router.post('/check', authGuard, roleGuard, CustomActionCallController.checkUrl);

export default router;