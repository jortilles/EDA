import * as tf from '@tensorflow/tfjs';

export class TensorflowService {

    /**
     * Punto de entrada principal.
     * Decide si usar params manuales (LSTM fijo) o automáticos (con fallback).
     */
    static async forecast(dataset: number[], steps: number, tfParams?: {epochs: number, lookback: number, learningRate: number}, referenceDatasets?: number[][]): Promise<number[]> {
        if (!Array.isArray(dataset) || dataset.length < 4) {
            throw new Error('Dataset insuficiente para predicción (mínimo 4 valores)');
        }

        if (dataset.some(v => !isFinite(v) || isNaN(v))) {
            throw new Error('Dataset contiene valores inválidos');
        }

        // Con params manuales: LSTM directo, sin fallback
        if (tfParams) {
            return await TensorflowService.lstmForecast(dataset, steps, tfParams, referenceDatasets);
        }

        // Sin params: LSTM → red densa → tendencia lineal
        try {
            return await TensorflowService.lstmForecast(dataset, steps, tfParams, referenceDatasets);
        } catch (err) {
            console.warn('LSTM falló, usando red densa como fallback:', err.message);
            try {
                return await TensorflowService.denseForecast(dataset, steps);
            } catch (err2) {
                console.warn('Red densa falló, usando tendencia lineal:', err2.message);
                return TensorflowService.linearFallback(dataset, steps);
            }
        }
    }

    /**
     * Modelo LSTM (Long Short-Term Memory).
     * Si se pasan referenceDatasets, entrena un modelo multivariante:
     * cada timestep tiene tantos features como (1 + nº columnas de referencia).
     * La predicción del target se hace iterativamente: cada predicción
     * se añade a la ventana para predecir el siguiente paso.
     * Para las referencias, se repite el último valor conocido (extrapolación constante).
     */
    private static async lstmForecast(dataset: number[], steps: number, tfParams?: {epochs: number, lookback: number, learningRate: number}, referenceDatasets?: number[][]): Promise<number[]> {
        const useMultivariate = referenceDatasets && referenceDatasets.length > 0;
        const numFeatures = 1 + (useMultivariate ? referenceDatasets.length : 0);

        // Normalizar target
        const { normalized: normTarget, min, max } = TensorflowService.normalize(dataset);

        // Normalizar cada columna de referencia independientemente
        const normRefs: number[][] = useMultivariate
            ? referenceDatasets.map(ref => TensorflowService.normalize(ref).normalized)
            : [];

        const windowSize = tfParams?.lookback
            ? Math.min(tfParams.lookback, dataset.length - 1)
            : Math.min(Math.max(3, Math.floor(dataset.length / 3)), 10);

        if (dataset.length < windowSize + 1) {
            throw new Error('Dataset demasiado corto para ventana LSTM');
        }

        // Crear ventanas deslizantes multivariantes
        // Cada muestra: [windowSize][numFeatures]
        const xs: number[][][] = [];
        const ys: number[] = [];

        for (let i = 0; i <= normTarget.length - windowSize - 1; i++) {
            const windowVectors: number[][] = [];
            for (let t = i; t < i + windowSize; t++) {
                const vec = [normTarget[t]];
                normRefs.forEach(ref => vec.push(ref[t]));
                windowVectors.push(vec);
            }
            xs.push(windowVectors);
            ys.push(normTarget[i + windowSize]);
        }

        // Tensores: [samples, timesteps, numFeatures]
        const inputTensor = tf.tensor3d(xs);
        const outputTensor = tf.tensor2d(ys.map(y => [y]));

        // Modelo LSTM
        const model = tf.sequential();
        model.add(tf.layers.lstm({
            units: 32,
            inputShape: [windowSize, numFeatures],
            returnSequences: false
        }));
        model.add(tf.layers.dense({ units: 1 }));

        model.compile({
            optimizer: tf.train.adam(tfParams?.learningRate || 0.01),
            loss: 'meanSquaredError'
        });

        // Entrenar
        const epochs = tfParams?.epochs || Math.min(50, Math.max(20, Math.floor(200 / xs.length)));
        await model.fit(inputTensor, outputTensor, {
            epochs,
            batchSize: Math.min(32, xs.length),
            verbose: 0
        });

        // Predecir iterativamente
        const predictions: number[] = [];

        // Ventana actual: [windowSize][numFeatures]
        let currentWindow: number[][] = normTarget.slice(-windowSize).map((v, i) => {
            const vec = [v];
            normRefs.forEach(ref => vec.push(ref[ref.length - windowSize + i]));
            return vec;
        });

        // Últimos valores conocidos de las refs (extrapolación constante)
        const lastRefValues: number[] = normRefs.map(ref => ref[ref.length - 1]);

        for (let i = 0; i < steps; i++) {
            const input = tf.tensor3d([currentWindow]);
            const pred = model.predict(input) as tf.Tensor;
            const value = pred.dataSync()[0];
            predictions.push(value);

            // Deslizar ventana: nuevo vector con predicción del target + últimos valores de referencia
            const newVec = [value, ...lastRefValues];
            currentWindow = [...currentWindow.slice(1), newVec];

            input.dispose();
            pred.dispose();
        }

        // Limpiar memoria
        inputTensor.dispose();
        outputTensor.dispose();
        model.dispose();

        // Desnormalizar y validar (solo el target)
        const denormalized = TensorflowService.denormalize(predictions, min, max);
        return TensorflowService.validatePredictions(denormalized, dataset);
    }

    /**
     * Fallback 1: Red neuronal densa simple (univariante).
     * Arquitectura: Dense(16, relu) → Dense(8, relu) → Dense(1)
     * Más ligera que LSTM y sin dependencia de orden temporal explícita.
     */
    private static async denseForecast(dataset: number[], steps: number): Promise<number[]> {
        const { normalized, min, max } = TensorflowService.normalize(dataset);
        const windowSize = Math.min(Math.max(2, Math.floor(dataset.length / 3)), 8);

        if (dataset.length < windowSize + 1) {
            throw new Error('Dataset demasiado corto para red densa');
        }

        // Crear ventana deslizante
        const xs: number[][] = [];
        const ys: number[] = [];
        for (let i = 0; i <= normalized.length - windowSize - 1; i++) {
            xs.push(normalized.slice(i, i + windowSize));
            ys.push(normalized[i + windowSize]);
        }

        const inputTensor = tf.tensor2d(xs);
        const outputTensor = tf.tensor2d(ys.map(y => [y]));

        // Modelo denso simple
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [windowSize] }));
        model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1 }));

        model.compile({
            optimizer: tf.train.adam(0.01),
            loss: 'meanSquaredError'
        });

        await model.fit(inputTensor, outputTensor, {
            epochs: 100,
            batchSize: Math.min(32, xs.length),
            verbose: 0
        });

        // Predecir iterativamente
        const predictions: number[] = [];
        let currentWindow = normalized.slice(-windowSize);

        for (let i = 0; i < steps; i++) {
            const input = tf.tensor2d([currentWindow]);
            const pred = model.predict(input) as tf.Tensor;
            const value = pred.dataSync()[0];
            predictions.push(value);
            currentWindow = [...currentWindow.slice(1), value];
            input.dispose();
            pred.dispose();
        }

        // Limpiar memoria
        inputTensor.dispose();
        outputTensor.dispose();
        model.dispose();

        const denormalized = TensorflowService.denormalize(predictions, min, max);
        return TensorflowService.validatePredictions(denormalized, dataset);
    }

    /**
     * Fallback 2: Tendencia lineal por mínimos cuadrados.
     * Último recurso si tanto LSTM como red densa fallan.
     * Calcula la pendiente sobre los últimos 10 puntos y proyecta linealmente.
     */
    private static linearFallback(dataset: number[], steps: number): number[] {
        const windowSize = Math.min(10, dataset.length);
        const recentData = dataset.slice(-windowSize);
        const n = recentData.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = recentData.reduce((a, b) => a + b, 0);
        const sumXY = recentData.reduce((sum, y, i) => sum + i * y, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const last = dataset[dataset.length - 1];

        return Array.from({ length: steps }, (_, i) => Math.round((last + slope * (i + 1)) * 100) / 100);
    }

    private static normalize(data: number[]): { normalized: number[], min: number, max: number } {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        return {
            normalized: data.map(v => (v - min) / range),
            min,
            max
        };
    }

    private static denormalize(data: number[], min: number, max: number): number[] {
        const range = max - min || 1;
        return data.map(v => v * range + min);
    }

    private static validatePredictions(predictions: number[], originalDataset: number[]): number[] {
        const minData = Math.min(...originalDataset);
        const maxData = Math.max(...originalDataset);
        const range = maxData - minData;

        const validated = predictions.map(pred => {
            return Math.max(minData - range * 0.5, Math.min(maxData + range * 0.5, pred));
        });

        return validated.map(pred => Math.round(pred * 100) / 100);
    }
}
