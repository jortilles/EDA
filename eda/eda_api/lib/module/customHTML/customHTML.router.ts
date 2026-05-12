import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { CustomHTMLController } from './customHTML.controller';

const router = express.Router();

/**
 * @openapi
 * /customHTML/{key}:
 *   get:
 *     description: Retrieves a custom HTML panel content by its unique key identifier.
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         type: string
 *         description: Unique key identifying the custom HTML panel
 *     responses:
 *       200:
 *         description: Custom HTML content returned successfully.
 *       404:
 *         description: No custom HTML found for the given key.
 *       500:
 *         description: Server error retrieving custom HTML.
 *     tags:
 *       - Custom HTML Routes
 */
router.get('/:key', CustomHTMLController.get);

/**
 * @openapi
 * /customHTML/{key}:
 *   put:
 *     description: Creates or updates a custom HTML panel content identified by the given key. Requires authentication.
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         type: string
 *         description: Unique key identifying the custom HTML panel
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             html:
 *               type: string
 *               description: HTML content to store
 *             css:
 *               type: string
 *               description: Optional CSS styles for the panel
 *     responses:
 *       200:
 *         description: Custom HTML panel created or updated successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       500:
 *         description: Server error saving custom HTML.
 *     tags:
 *       - Custom HTML Routes
 */
router.put('/:key', authGuard, CustomHTMLController.upsert);

export default router;
