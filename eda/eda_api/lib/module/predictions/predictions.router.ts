// api/lib/module/arima.router.ts
import * as express from 'express';
import { ArimaController } from './predictions.controller';
const router = express.Router();

// Endpoint para predecir con ARIMA
router.post('/predict', ArimaController.predict);

export default router;
