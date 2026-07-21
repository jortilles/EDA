import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { HoldedController } from './holded.controller';

const router = express.Router();

/**
 * @openapi
 * /holded/download:
 *   post:
 *     description: Descarga facturas, contactos, productos y asientos contables de Holded y los guarda como CSV
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [apiKey, folderName]
 *             properties:
 *               apiKey:
 *                 type: string
 *               folderName:
 *                 type: string
 *                 description: Nombre de la subcarpeta en duckdb/
 *               dateFrom:
 *                 type: string
 *                 example: "2024-01-01"
 *               dateTo:
 *                 type: string
 *                 example: "2024-12-31"
 *     responses:
 *       200:
 *         description: Datos descargados correctamente
 *       400:
 *         description: Parámetros requeridos no proporcionados
 *       500:
 *         description: Error descargando datos de Holded
 *     tags:
 *       - Holded Routes
 */
router.post('/add-data-source', authGuard, roleGuard, HoldedController.addDataSource);
router.post('/download', authGuard, roleGuard, HoldedController.downloadData);

export default router;
