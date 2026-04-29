import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { CustomHTMLController } from './customHTML.controller';

const router = express.Router();

router.get('/:key', CustomHTMLController.get);
router.put('/:key', authGuard, CustomHTMLController.upsert);

export default router;
