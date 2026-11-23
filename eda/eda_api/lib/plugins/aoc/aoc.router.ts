import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { AOCController } from './aoc.controller';

const router = express.Router();

/**
 * @openapi
 * /aoc/ambitos:
 *   post:
 *     description: Lista los ámbitos (esquemas) del datalake AOC reconocidos en AOC_AMBITOS_MAP, ya traducidos a su nombre legible
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [host, database, user, password]
 *             properties:
 *               host:
 *                 type: string
 *               port:
 *                 type: integer
 *               database:
 *                 type: string
 *               user:
 *                 type: string
 *               password:
 *                 type: string
 *               ssl:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Ámbitos detectados
 *     tags:
 *       - AOC Routes
 */
router.post('/ambitos', authGuard, roleGuard, AOCController.listAmbitos);
router.post('/add-data-source', authGuard, roleGuard, AOCController.addDataSource);

export default router;
