import * as  express from 'express';
import { GoogleController } from './GOOGLE.controller';

const router = express.Router();

// Botón Login "Single Sing-On" con Google
router.post('/login', GoogleController.login);


export default router;