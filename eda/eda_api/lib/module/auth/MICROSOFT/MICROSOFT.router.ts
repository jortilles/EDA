import * as  express from 'express';
import { MicrosoftController } from './MICROSOFT.controller';

const router = express.Router();

// Botón Login "Single Sing-On" con Google
router.post('/login', MicrosoftController.login);


export default router;