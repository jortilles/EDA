import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { UploadController } from './upload.controller';
import { UploadFileController } from './files/uploadFileController';


const router = express.Router();

router.put('', authGuard, UploadController.uploadProfile);
router.post('/addFile', authGuard, UploadFileController.uploadFile );
router.post('/bigqueryCredentials', authGuard, UploadFileController.uploadBigQueryCredentials );
router.get('/addFile/:id', authGuard, UploadFileController.readFile );

export default router;
