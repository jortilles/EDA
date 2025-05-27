import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { QueryController } from './query.controller';

const router = express.Router();

/**
 * @openapi
 * /query/analized:
 *   post:
 *     description: executes a query from SQL mode 
 *     parameters: 
 *       - name: token
 *         in: query
 *         description: Authentication token
 *         type: string 
 *       - name: query
 *         in: body
 *         required: true
 *         type: object
 *         description: Query configuration
 *     responses:
 *       200:
 *         description: returns ok 
 *       500:
 *         description: returns error by permisos or query error
 *     tags:
 *       - Dashboard Routes
 */     
router.post('/analized', authGuard, QueryController.execAnalizedQuery);

export default router;
