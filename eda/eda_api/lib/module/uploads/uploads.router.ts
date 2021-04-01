import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { UploadController } from './upload.controller';
import { UploadFileController } from './files/uploadFileController';
import { roleGuard } from '../../guards/role-guard';


const router = express.Router();

router.put('', authGuard, UploadController.uploadProfile);
router.post('/addFile', authGuard,  UploadFileController.uploadFile );
router.post('/bigqueryCredentials', authGuard,roleGuard, UploadFileController.uploadBigQueryCredentials );
router.get('/readGeoJsonFile/:id', authGuard, UploadFileController.readGeoJsonFile );

export default router;
