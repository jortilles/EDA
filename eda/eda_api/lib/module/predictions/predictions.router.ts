import * as express from 'express';
import { PredictionsController } from './predictions.controller';
import { authGuard } from '../../guards/auth-guard'; // opcional

const router = express.Router();

router.post('/predict', authGuard, PredictionsController.predictArima);
router.post('/tensorflow/predict', authGuard, PredictionsController.predictTensorflow);

export default router;
