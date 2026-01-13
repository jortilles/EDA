import * as express from 'express';
import { ArimaController } from './predictions.controller';
import { authGuard } from '../../guards/auth-guard'; // opcional

const router = express.Router();

router.post('/predict', authGuard, ArimaController.predict);

export default router;
