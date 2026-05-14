import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { AddTableController } from './addtable.controller';

const router = express.Router();

/**
 * @openapi
 * /addTable/create:
 *   post:
 *     description: Creates a new table in the datasource model with the specified columns and configuration. Requires admin role.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             datasourceId:
 *               type: string
 *               description: ID of the datasource where the table will be created
 *             tableName:
 *               type: string
 *               description: Name for the new table
 *             columns:
 *               type: array
 *               description: Column definitions for the new table
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *     responses:
 *       200:
 *         description: Table created successfully in the datasource model.
 *       401:
 *         description: Unauthorized - authentication required.
 *       403:
 *         description: Forbidden - admin role required.
 *       500:
 *         description: Server error creating the table.
 *     tags:
 *       - Add Table Routes
 */
router.post('/create', authGuard, roleGuard, AddTableController.createTable);

/**
 * @openapi
 * /addTable/insert:
 *   post:
 *     description: Inserts data rows into an existing table of the datasource model. Requires admin role.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             datasourceId:
 *               type: string
 *               description: ID of the datasource containing the target table
 *             tableName:
 *               type: string
 *               description: Name of the table to insert data into
 *             rows:
 *               type: array
 *               description: Array of row objects to insert
 *               items:
 *                 type: object
 *     responses:
 *       200:
 *         description: Data inserted successfully into the table.
 *       401:
 *         description: Unauthorized - authentication required.
 *       403:
 *         description: Forbidden - admin role required.
 *       500:
 *         description: Server error inserting data.
 *     tags:
 *       - Add Table Routes
 */
router.post('/insert', authGuard, roleGuard, AddTableController.insertToTable);

export default router;