import * as express from 'express';
import { PredictionsController } from './predictions.controller';
import { authGuard } from '../../guards/auth-guard'; // opcional

const router = express.Router();

/**
 * @openapi
 * /arima/predict:
 *   post:
 *     description: Runs an ARIMA time-series prediction model on the provided data and returns forecasted values.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             data:
 *               type: array
 *               items:
 *                 type: number
 *               description: Historical time-series data points
 *             steps:
 *               type: integer
 *               description: Number of future steps to forecast
 *             p:
 *               type: integer
 *               description: ARIMA autoregressive order
 *             d:
 *               type: integer
 *               description: ARIMA differencing order
 *             q:
 *               type: integer
 *               description: ARIMA moving average order
 *     responses:
 *       200:
 *         description: ARIMA prediction completed, forecasted values returned.
 *       401:
 *         description: Unauthorized - authentication required.
 *       500:
 *         description: Server error running ARIMA prediction.
 *     tags:
 *       - Predictions Routes
 */
router.post('/predict', authGuard, PredictionsController.predictArima);

/**
 * @openapi
 * /arima/tensorflow/predict:
 *   post:
 *     description: Runs a TensorFlow/LSTM neural network prediction model on the provided data and returns forecasted values.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             data:
 *               type: array
 *               items:
 *                 type: number
 *               description: Historical time-series data points
 *             steps:
 *               type: integer
 *               description: Number of future steps to forecast
 *             epochs:
 *               type: integer
 *               description: Number of training epochs
 *     responses:
 *       200:
 *         description: TensorFlow prediction completed, forecasted values returned.
 *       401:
 *         description: Unauthorized - authentication required.
 *       500:
 *         description: Server error running TensorFlow prediction.
 *     tags:
 *       - Predictions Routes
 */
router.post('/tensorflow/predict', authGuard, PredictionsController.predictTensorflow);

export default router;
