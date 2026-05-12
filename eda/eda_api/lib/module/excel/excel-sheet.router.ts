import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { ExcelSheetController } from './excel-sheet.controller';

const router = express.Router();

/**
 * @openapi
 * /excel-sheets/add-json-data-source:
 *   post:
 *     description: Adds/updates the excel sheet object passed within the body/form, checking by the name field.
 *     parameters:
 *       - name: token
 *         in: path
 *         required: true
 *         type: string
 *       - name: excelsheet
 *         in: body
 *         required: true
 *         type: object
 *     responses:
 *       200:
 *         description: Creation/Update of the excel sheet successfull
 *       500:
 *         description: Error trying to create the new excel sheet
 *     tags:
 *       - Excel Sheets Routes
 */
router.post('/add-json-data-source',authGuard,roleGuard,ExcelSheetController.GenerateCollectionFromJSON);

/**
 * @openapi
 * /excel-sheets/update-json-data-source/{id}:
 *   put:
 *     description: Updates an existing Excel/JSON datasource collection by its ID. Requires admin role.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *         description: ID of the Excel datasource to update
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           description: Updated Excel sheet data and configuration
 *     responses:
 *       200:
 *         description: Excel datasource updated successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       403:
 *         description: Forbidden - admin role required.
 *       500:
 *         description: Server error updating Excel datasource.
 *     tags:
 *       - Excel Sheets Routes
 */
router.put('/update-json-data-source/:id',authGuard,roleGuard,ExcelSheetController.UpdateCollectionFromJSON);

/**
 * @openapi
 * /excel-sheets/existent-json-data-source:
 *   post:
 *     description: Checks whether an Excel/JSON datasource with the given name already exists in the system. Requires admin role.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: Name of the Excel datasource to check for existence
 *     responses:
 *       200:
 *         description: Returns boolean indicating whether the datasource exists.
 *       401:
 *         description: Unauthorized - authentication required.
 *       403:
 *         description: Forbidden - admin role required.
 *       500:
 *         description: Server error checking Excel datasource existence.
 *     tags:
 *       - Excel Sheets Routes
 */
router.post('/existent-json-data-source',authGuard,roleGuard,ExcelSheetController.ExistsExcelData);
export default router;