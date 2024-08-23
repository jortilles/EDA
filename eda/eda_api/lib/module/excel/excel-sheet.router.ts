import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { ExcelSheetController } from './excel-sheet.controller';

const router = express.Router();

/**
 * @openapi
 * /excel-sheets/add-json-data-source
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
//TODO
router.post('/existent-json-data-source',authGuard,roleGuard,ExcelSheetController.ExistsExcelData);
export default router;