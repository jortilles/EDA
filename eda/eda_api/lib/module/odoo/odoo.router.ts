import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { OdooController } from './odoo.controller';

const router = express.Router();

/**
 * @openapi
 * /odoo/download-invoices:
 *   post:
 *     description: Descarga facturas de Odoo y las guarda como CSV en duckdb/odoo/
 *     parameters:
 *       - name: token
 *         description: Authentication token
 *         type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url, db, username, password]
 *             properties:
 *               url:
 *                 type: string
 *                 example: "https://mi-odoo.com"
 *               db:
 *                 type: string
 *                 example: "mi_base_de_datos"
 *               username:
 *                 type: string
 *                 example: "admin"
 *               password:
 *                 type: string
 *                 example: "mi_contraseña"
 *               dateFrom:
 *                 type: string
 *                 example: "2024-01-01"
 *               dateTo:
 *                 type: string
 *                 example: "2024-12-31"
 *               invoiceTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["out_invoice", "in_invoice", "out_refund", "in_refund"]
 *     responses:
 *       200:
 *         description: Facturas descargadas correctamente
 *       400:
 *         description: Parámetros requeridos no proporcionados
 *       401:
 *         description: Autenticación fallida en Odoo
 *       500:
 *         description: Error descargando facturas de Odoo
 *     tags:
 *       - Odoo Routes
 */
router.post('/download-invoices', authGuard, roleGuard, OdooController.downloadInvoices);

export default router;
