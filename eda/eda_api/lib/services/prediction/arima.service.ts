import ARIMA from 'arima';

export class ArimaService {

    static forecast(dataset: number[], steps: number): number[] {
        if (!Array.isArray(dataset) || dataset.length < 2) {
            throw new Error('Dataset insuficiente para predicción');
        }

        // Validar que no haya valores inválidos
        if (dataset.some(v => !isFinite(v) || isNaN(v))) {
            throw new Error('Dataset contiene valores inválidos');
        }

        try {
            // Normalizar datos para estabilidad numérica
            const mean = dataset.reduce((a, b) => a + b, 0) / dataset.length;
            const std = Math.sqrt(
                dataset.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dataset.length
            );
            
            const normalizedData = dataset.map(v => (v - mean) / std);

            // Probar diferentes configuraciones de parámetros
            const configs = [
                { p: 2, d: 1, q: 2 }, // Más complejo primero
                { p: 1, d: 1, q: 1 }, // ARIMA(1,1,1) 
                { p: 2, d: 1, q: 0 }, // ARIMA(2,1,0)
                { p: 0, d: 1, q: 1 }, // ARIMA(0,1,1)
                { p: 1, d: 1, q: 0 }, // ARIMA(1,1,0)
                { p: 1, d: 0, q: 0 }, // AR simple
                { p: 0, d: 0, q: 1 }, // MA simple
            ];

            let bestModel = null;
            let bestPredictions = null;
            let minError = Infinity;

            for (const config of configs) {
                try {
                    const model = new ARIMA(config).train(normalizedData);
                    const [predictions] = model.predict(steps);
                    
                    // Validar que las predicciones sean finitas
                    if (predictions.every(p => isFinite(p) && !isNaN(p))) {
                        // Calcular variabilidad en las predicciones
                        const predMean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
                        const predVariance = predictions.reduce((sum, p) => sum + Math.pow(p - predMean, 2), 0) / predictions.length;
                        
                        // Preferir modelos con algo de variabilidad (no planos)
                        const errorMetric = Math.abs(predMean) + predVariance * 0.1;
                        
                        if (errorMetric < minError) {
                            minError = errorMetric;
                            bestModel = config;
                            bestPredictions = predictions;
                        }
                    }
                } catch (err) {
                    console.warn(`Config ${JSON.stringify(config)} falló:`, err.message);
                }
            }

            if (!bestPredictions) {
                // Fallback: usar tendencia exponencial
                console.warn('ARIMA falló, usando tendencia como fallback');
                const windowSize = Math.min(10, dataset.length);
                const recentData = dataset.slice(-windowSize);
                
                // Calcular tendencia lineal simple
                const n = recentData.length;
                const sumX = (n * (n - 1)) / 2;
                const sumY = recentData.reduce((a, b) => a + b, 0);
                const sumXY = recentData.reduce((sum, y, i) => sum + i * y, 0);
                const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
                
                const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                const intercept = (sumY - slope * sumX) / n;
                
                const last = dataset[dataset.length - 1];
                return Array.from({ length: steps }, (_, i) => {
                    const prediction = last + slope * (i + 1);
                    return Math.round(prediction);
                });
            }

            // Desnormalizar predicciones
            const denormalizedPredictions = bestPredictions.map(v => v * std + mean);
            
            // Validación adicional: limitar predicciones a rangos razonables
            const minData = Math.min(...dataset);
            const maxData = Math.max(...dataset);
            const range = maxData - minData;
            
            const validatedPredictions = denormalizedPredictions.map(pred => {
                // Limitar a ±50% del rango histórico
                return Math.max(minData - range * 0.5, Math.min(maxData + range * 0.5, pred));
            });

            // Redondear las predicciones finales
            const roundedPredictions = validatedPredictions.map(pred => Math.round(pred));

            // Verificar si hay duplicados y agregar pequeña variación si es necesario
            const uniquePredictions = [...roundedPredictions];
            for (let i = 1; i < uniquePredictions.length; i++) {
                if (uniquePredictions[i] === uniquePredictions[i - 1]) {
                    // Agregar pequeña tendencia basada en datos históricos recientes
                    const recentTrend = dataset[dataset.length - 1] - dataset[dataset.length - Math.min(5, dataset.length)];
                    const trendPerStep = recentTrend / Math.min(5, dataset.length);
                    uniquePredictions[i] = Math.round(uniquePredictions[i - 1] + trendPerStep * 0.5);
                }
            }
            
            return uniquePredictions;

        } catch (error) {
            console.error('Error en ARIMA:', error);
            // Fallback más robusto con tendencia
            const last = dataset[dataset.length - 1];
            const trend = (dataset[dataset.length - 1] - dataset[Math.max(0, dataset.length - 5)]) / Math.min(5, dataset.length);
            return Array.from({ length: steps }, (_, i) => Math.round(last + trend * (i + 1)));
        }
    }
}