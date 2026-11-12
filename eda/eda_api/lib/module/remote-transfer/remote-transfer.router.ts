import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { RemoteTransferController } from './remote-transfer.controller';

const router = express.Router();

/**
 * @openapi
 * /remote-transfer/login:
 *   post:
 *     description: Logs in on another Edalitics instance (destination). The credentials are only forwarded to the destination and never stored.
 *     parameters:
 *     - in: query
 *       name: token
 *       required: true
 *       description: local authorization token
 *     - in: body
 *       name: credentials
 *       schema:
 *         type: object
 *         properties:
 *           url:
 *             type: string
 *             example: "https://edalitics.example.com"
 *           email:
 *             type: string
 *           password:
 *             type: string
 *     responses:
 *       200:
 *         description: Returns the resolved remote API URL and the remote token.
 *       400:
 *         description: Invalid URL or incorrect remote credentials.
 *       502:
 *         description: The remote server could not be reached or is not an Edalitics server.
 *     tags:
 *       - Remote Transfer Routes
 */
router.post('/login', authGuard, roleGuard, RemoteTransferController.login);

/**
 * @openapi
 * /remote-transfer/send:
 *   post:
 *     description: Sends a data model or a dashboard to another Edalitics instance keeping its _id. Datasource passwords never travel.
 *     parameters:
 *     - in: query
 *       name: token
 *       required: true
 *       description: local authorization token
 *     - in: body
 *       name: transfer
 *       schema:
 *         type: object
 *         properties:
 *           apiUrl:
 *             type: string
 *           token:
 *             type: string
 *             description: remote token returned by /remote-transfer/login
 *           type:
 *             type: string
 *             enum: [datasource, dashboard]
 *           id:
 *             type: string
 *     responses:
 *       200:
 *         description: Object sent. Returns whether it was created in the destination.
 *       400:
 *         description: Invalid request.
 *       404:
 *         description: Local object not found.
 *       412:
 *         description: Remote session expired, a new remote login is required.
 *       502:
 *         description: The remote server rejected the object or could not be reached.
 *     tags:
 *       - Remote Transfer Routes
 */
router.post('/send', authGuard, roleGuard, RemoteTransferController.send);

export default router;
