import ARIMA from 'arima';

export class ArimaService {

    static forecast(dataset: number[], steps: number): number[] {
        if (!Array.isArray(dataset) || dataset.length < 2) {
            throw new Error('Dataset insuficiente para predicción');
        }

        // Entrenar modelo ARIMA
        const model = new ARIMA({ p: 1, d: 1, q: 1 }).train(dataset);

        // Predecir pasos futuros
        const [predictions] = model.predict(steps);
        return predictions;
    }
}
