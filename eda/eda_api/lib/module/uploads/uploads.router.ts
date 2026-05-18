import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { UploadController } from './upload.controller';
import { UploadFileController } from './files/uploadFileController';
import { roleGuard } from '../../guards/role-guard';


const router = express.Router();

/**
 * @openapi
 * /global/upload:
 *   put:
 *     description: Uploads and updates the profile image for the authenticated user.
 *     parameters:
 *       - name: file
 *         in: formData
 *         required: true
 *         type: file
 *         description: Profile image file (jpg, png, etc.)
 *     responses:
 *       200:
 *         description: Profile image uploaded and saved successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       500:
 *         description: Server error uploading profile image.
 *     tags:
 *       - Upload Routes
 */
router.put('', authGuard, UploadController.uploadProfile);

/**
 * @openapi
 * /global/upload/addFile:
 *   post:
 *     description: Uploads a data file (CSV, Excel, GeoJSON, etc.) to be used as a datasource.
 *     parameters:
 *       - name: file
 *         in: formData
 *         required: true
 *         type: file
 *         description: Data file to upload
 *     responses:
 *       200:
 *         description: File uploaded successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       500:
 *         description: Server error uploading file.
 *     tags:
 *       - Upload Routes
 */
router.post('/addFile', authGuard,  UploadFileController.uploadFile );

/**
 * @openapi
 * /global/upload/bigqueryCredentials:
 *   post:
 *     description: Uploads the Google BigQuery service account credentials JSON file. Requires admin role.
 *     parameters:
 *       - name: file
 *         in: formData
 *         required: true
 *         type: file
 *         description: BigQuery service account credentials JSON file
 *     responses:
 *       200:
 *         description: BigQuery credentials uploaded successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       403:
 *         description: Forbidden - admin role required.
 *       500:
 *         description: Server error uploading credentials.
 *     tags:
 *       - Upload Routes
 */
router.post('/bigqueryCredentials', authGuard,roleGuard, UploadFileController.uploadBigQueryCredentials );

/**
 * @openapi
 * /global/upload/readGeoJsonFile/{id}:
 *   get:
 *     description: Reads and returns the content of a GeoJSON file by its datasource ID.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *         description: Datasource ID associated with the GeoJSON file
 *     responses:
 *       200:
 *         description: GeoJSON file content returned successfully.
 *       401:
 *         description: Unauthorized - authentication required.
 *       404:
 *         description: GeoJSON file not found for the given ID.
 *       500:
 *         description: Server error reading GeoJSON file.
 *     tags:
 *       - Upload Routes
 */
router.get('/readGeoJsonFile/:id', authGuard, UploadFileController.readGeoJsonFile );

export default router;
