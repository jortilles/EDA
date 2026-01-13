import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
import { ArimaService as ArimaLogic} from '../../services/prediction/arima.service';

export class ArimaController {

    static async predict(req: Request, res: Response, next: NextFunction) {
        try {
            console.log('hol2a!')
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

}
