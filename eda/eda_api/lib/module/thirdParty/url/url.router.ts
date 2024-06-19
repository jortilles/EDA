
import * as  express from 'express';
import { UrlController } from './url.controller';
const router = express.Router();

// ruta ->  /tp/url
router.post('/check', UrlController.urlCheck);


export default router;
