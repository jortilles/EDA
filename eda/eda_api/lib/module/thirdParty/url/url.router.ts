
import * as  express from 'express';
import { UrlController } from './url.controller';
const router = express.Router();

/**
 * @openapi
 * /url/check/:
 *   post: 
 *     description: Post an user to a third party authenticato
 *     responses:
 *       200:
 *         description: Return the user is authenticathed
 *       400:
 *         description: User is not logged
 */
router.post('/check', UrlController.urlCheck);


export default router;
