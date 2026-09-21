import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { GetSdaInfoController } from './getSdaInfo.controller';

const router = express.Router();

/**
 * @openapi
 * /getsdainfo/getinfo:
 *   get:
 *     description: Returns information about the current SinergiaDA installation (versions, API port, last synchronization with SinergiaCRM)
 *     parameters:
 *     - in: query
 *       name: token
 *       required: true
 *       description: authorization token
 *     responses:
 *       200:
 *         description: Information retrieved successfully
 *     tags:
 *       - SDA Info Routes
 */
router.get('/getinfo', authGuard, GetSdaInfoController.getinfo);

export default router;
