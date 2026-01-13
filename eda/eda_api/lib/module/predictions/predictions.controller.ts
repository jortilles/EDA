// api/lib/module/arima.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ArimaService } from 'services/prediction/arima.service';
export class ArimaController {

    // POST /api/arima/predict
    static async predict(req: Request, res: Response, next: NextFunction) {
        try {
            const { dataset, steps } = req.body;

            if (!dataset || !Array.isArray(dataset)) {
                return res.status(400).json({ 
                    ok: false, 
                    message: 'Dataset inválido' 
                });
            }

            // Llamada al servicio ARIMA
            const predictions = ArimaService.forecast(dataset, steps || 1);

            res.status(200).json({
                ok: true,
                predictions
            });

        } catch (err) {
            console.error(err);
            next(err); // o next(new HttpException(500, 'Error generando predicción'));
        }
    }
}
