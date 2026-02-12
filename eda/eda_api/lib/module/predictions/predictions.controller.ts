import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
import { ArimaService as ArimaLogic} from '../../services/prediction/arima.service';
import { TensorflowService } from '../../services/prediction/tensorflow.service';

export class PredictionsController {
    // Listado de todas las llamadas a la API para las predicciones

    // LLamada a Arima
    static async predictArima(req: Request, res: Response, next: NextFunction) {
        try {
            const { dataset, steps } = req.body;

            if (!dataset || !Array.isArray(dataset)) {
                return res.status(400).json({ ok: false, message: 'Dataset inválido' });
            }

            // Llamada al servicio ARIMA
            const predictions = ArimaLogic.forecast(dataset, steps || 1);

            res.status(200).json({
                ok: true,
                predictions
            });

        } catch (err) {
            console.error(err);
            next(new HttpException(500, 'Error generando predicción ARIMA'));
        }
    }

    // LLamada a TensorFlow
    static async predictTensorflow(req: Request, res: Response, next: NextFunction) {
        try {
            const { dataset, steps } = req.body;

            if (!dataset || !Array.isArray(dataset)) {
                return res.status(400).json({ ok: false, message: 'Dataset inválido' });
            }

            const predictions = await TensorflowService.forecast(dataset, steps || 1);

            res.status(200).json({
                ok: true,
                predictions
            });

        } catch (err) {
            console.error(err);
            next(new HttpException(500, 'Error generando predicción TensorFlow'));
        }
    }
}
