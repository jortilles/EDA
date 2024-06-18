
import * as  express from 'express';
import { UrlController } from './url.controller';
const router = express.Router();

// /tp/url
router.post('/check', UrlController.urlCheck);


export default router;
