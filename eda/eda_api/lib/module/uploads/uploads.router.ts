import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { UploadController } from './upload.controller';

const router = express.Router();

router.put('', authGuard, UploadController.uploadProfile);

export default router;
