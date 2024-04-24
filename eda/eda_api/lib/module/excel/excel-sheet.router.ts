import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { ExcelSheetController } from './excel-sheet.controller';

const router = express.Router();

/**
 * @openapi
 * /excel-sheets
 *   get:
 *     description: Gets all the current database excel sheets with the option of getting one by it's name.
 *     parameters:
 *       - name: token
 *         in: path
 *         required: true
 *         type: string
 *       - name: name
 *         in: path
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: Returns okay, successful connection with the database and excel sheets
 *       500:
 *         description: Can't connect with the current database
 *     tags:
 *       - Excel Sheets Routes
 */
router.get('',authGuard,roleGuard,ExcelSheetController.GetCollectionFromJSON);

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
export default router;