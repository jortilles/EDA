
import * as  express from 'express';
import { authGuard } from '../../../guards/auth-guard';
import { OAUTHController } from './OAUTH.controller';


const router = express.Router();


// Control de metadata
router.get('/login', OAUTHController.login);

router.get('/metadata', OAUTHController.metadata);

export default router;