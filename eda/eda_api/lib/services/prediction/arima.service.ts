import ARIMA from 'arima';

export class ArimaService {

    static forecast(dataset: number[], steps: number, arimaParams?: {p: number, d: number, q: number}): number[] {
        if (!Array.isArray(dataset) || dataset.length < 2) {
            throw new Error('Dataset insuficiente para predicción');
        }

        if (dataset.some(v => !isFinite(v) || isNaN(v))) {
            throw new Error('Dataset contiene valores inválidos');
        }

        console.log('\n╔══════════════════════════════════════════════════════════');
        console.log('║  ARIMA FORECAST — INICIO');
        console.log('╠══════════════════════════════════════════════════════════');
        console.log(`║  Puntos en el dataset: ${dataset.length}`);
        console.log(`║  Steps a predecir:     ${steps}`);
        console.log(`║  Modo:                 ${arimaParams ? `MANUAL  ARIMA(${arimaParams.p},${arimaParams.d},${arimaParams.q})` : 'AUTOMÁTICO'}`);
        console.log(`║  Dataset (primeros 5): [${dataset.slice(0, 5).join(', ')}${dataset.length > 5 ? ', ...' : ''}]`);
        console.log(`║  Dataset (últimos 5):  [${dataset.slice(-5).join(', ')}]`);
        console.log('╚══════════════════════════════════════════════════════════\n');

        try {
            // ── NORMALIZACIÓN ──────────────────────────────────────────
            const mean = dataset.reduce((a, b) => a + b, 0) / dataset.length;
            const std  = Math.sqrt(
                dataset.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dataset.length
            ) || 1;

            const normalizedData = dataset.map(v => (v - mean) / std);

            console.log('[1] NORMALIZACIÓN (z-score → media=0, std=1)');
            console.log(`  media:  ${mean.toFixed(4)}`);
            console.log(`  std:    ${std.toFixed(4)}`);
            console.log(`  fórmula: valor_norm = (valor - ${mean.toFixed(4)}) / ${std.toFixed(4)}`);
            console.log(`  normalizados (primeros 5): [${normalizedData.slice(0, 5).map(v => v.toFixed(4)).join(', ')}${normalizedData.length > 5 ? ', ...' : ''}]`);
            console.log(`  normalizados (últimos 5):  [${normalizedData.slice(-5).map(v => v.toFixed(4)).join(', ')}]`);

            // ── DETECCIÓN DE TENDENCIA (solo automático) ───────────────
            let hasTrend = false;
            let slope    = 0;

            if (!arimaParams) {
                const n     = normalizedData.length;
                const sumX  = n * (n - 1) / 2;
                const sumY  = normalizedData.reduce((a, b) => a + b, 0);
                const sumXY = normalizedData.reduce((s, y, i) => s + i * y, 0);
                const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
                const denom = n * sumX2 - sumX ** 2;
                slope       = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;

                // Umbral: pendiente significativa en datos normalizados
                // Una pendiente de 0.01 sobre n puntos supone un cambio de ~0.01*n desviaciones típicas
                hasTrend = Math.abs(slope) > 0.005;

                console.log('\n[2] DETECCIÓN DE TENDENCIA');
                console.log(`  Regresión lineal sobre datos normalizados:`);
                console.log(`  pendiente (slope) = ${slope.toFixed(6)}`);
                console.log(`  umbral de tendencia: |slope| > 0.005`);
                console.log(`  ¿Tiene tendencia?  ${hasTrend ? `SÍ (slope=${slope.toFixed(4)}) → priorizará configs con d≥1` : `NO  (slope=${slope.toFixed(4)}) → priorizará configs con d=0`}`);

                if (hasTrend) {
                    const direction = slope > 0 ? 'CRECIENTE' : 'DECRECIENTE';
                    console.log(`  Dirección de la tendencia: ${direction}`);
                }
            }

            // ── SELECCIÓN DE CONFIGS ───────────────────────────────────
            let configs: {p: number, d: number, q: number}[];

            if (arimaParams) {
                configs = [{ p: arimaParams.p, d: arimaParams.d, q: arimaParams.q }];
                console.log(`\n[2] MODO MANUAL — usando directamente ARIMA(${arimaParams.p},${arimaParams.d},${arimaParams.q})`);
            } else if (hasTrend) {
                // Serie con tendencia: priorizar diferenciación (d=1 o d=2)
                configs = [
                    { p: 1, d: 1, q: 1 },
                    { p: 2, d: 1, q: 1 },
                    { p: 2, d: 1, q: 2 },
                    { p: 1, d: 1, q: 0 },
                    { p: 0, d: 1, q: 1 },
                    { p: 2, d: 1, q: 0 },
                    { p: 3, d: 1, q: 0 },
                    { p: 0, d: 1, q: 2 },
                    { p: 1, d: 2, q: 1 },  // tendencia cuadrática
                    { p: 2, d: 0, q: 2 },  // fallback estacionario
                    { p: 1, d: 0, q: 1 },
                ];
                console.log('\n[3] CONFIGS A PROBAR (serie CON tendencia → priorizando d=1):');
            } else {
                // Serie estacionaria: probar primero sin diferenciación
                configs = [
                    { p: 2, d: 0, q: 2 },
                    { p: 1, d: 0, q: 1 },
                    { p: 2, d: 0, q: 1 },
                    { p: 3, d: 0, q: 0 },
                    { p: 0, d: 0, q: 2 },
                    { p: 1, d: 0, q: 0 },
                    { p: 0, d: 0, q: 3 },
                    { p: 2, d: 1, q: 1 },  // fallback con diferenciación
                    { p: 1, d: 1, q: 1 },
                    { p: 1, d: 1, q: 0 },
                ];
                console.log('\n[3] CONFIGS A PROBAR (serie SIN tendencia → priorizando d=0):');
            }

            if (!arimaParams) {
                configs.forEach((c, i) => console.log(`  [${i + 1}] ARIMA(${c.p},${c.d},${c.q})`));
            }

            // ── SPLIT VALIDACIÓN ───────────────────────────────────────
            const valSize       = Math.max(2, Math.floor(normalizedData.length * 0.25));
            const splitIdx      = normalizedData.length - valSize;
            const trainData     = normalizedData.slice(0, splitIdx);
            const valData       = normalizedData.slice(splitIdx);
            const useValidation = trainData.length >= 2 && valData.length >= 2;

            if (!arimaParams) {
                console.log('\n[4] SPLIT VALIDACIÓN');
                console.log(`  Total puntos: ${normalizedData.length}  →  train: ${trainData.length}  val: ${valData.length}`);
                console.log(`  ¿Usar validación? ${useValidation ? `SÍ (train=${trainData.length}, val=${valData.length})` : 'NO (dataset demasiado pequeño → modo varianza)'}`);
            }

            // ── EVALUACIÓN DE CONFIGS ──────────────────────────────────
            let bestPredictions: number[] | null = null;
            let bestConfig: {p: number, d: number, q: number} | null = null;
            let minError = Infinity;

            if (!arimaParams) console.log('\n[5] EVALUACIÓN DE CONFIGS:');

            for (const config of configs) {
                try {
                    let mse: number;

                    if (useValidation) {
                        const trainModel = new ARIMA(config).train(trainData);
                        const [valPreds] = trainModel.predict(valData.length);

                        if (!valPreds.every((p: number) => isFinite(p) && !isNaN(p))) {
                            if (!arimaParams) console.log(`  ARIMA(${config.p},${config.d},${config.q})  →  ❌ predicciones inválidas`);
                            continue;
                        }

                        mse = valData.reduce((sum, v, i) => sum + Math.pow(v - valPreds[i], 2), 0) / valData.length;
                        if (!arimaParams) console.log(`  ARIMA(${config.p},${config.d},${config.q})  MSE_val=${mse.toFixed(6)}${mse < minError ? '  ← mejor hasta ahora' : ''}`);
                    } else {
                        const model = new ARIMA(config).train(normalizedData);
                        const [preds] = model.predict(steps);

                        if (!preds.every((p: number) => isFinite(p) && !isNaN(p))) {
                            if (!arimaParams) console.log(`  ARIMA(${config.p},${config.d},${config.q})  →  ❌ predicciones inválidas`);
                            continue;
                        }

                        const predMean = preds.reduce((a: number, b: number) => a + b, 0) / preds.length;
                        const predVar  = preds.reduce((s: number, p: number) => s + Math.pow(p - predMean, 2), 0) / preds.length;
                        mse = predVar > 0 ? 1 / predVar : Infinity;
                        if (!arimaParams) console.log(`  ARIMA(${config.p},${config.d},${config.q})  var=${predVar.toFixed(6)}  score=${mse.toFixed(6)}${mse < minError ? '  ← mejor hasta ahora' : ''}`);
                    }

                    if (mse < minError) {
                        minError   = mse;
                        bestConfig = config;
                        const fullModel = new ARIMA(config).train(normalizedData);
                        const [preds]   = fullModel.predict(steps);
                        if (preds.every((p: number) => isFinite(p) && !isNaN(p))) {
                            bestPredictions = preds;
                        }
                    }
                } catch (err) {
                    if (!arimaParams) console.log(`  ARIMA(${config.p},${config.d},${config.q})  →  ❌ error: ${(err as Error).message}`);
                }
            }

            if (!bestPredictions) {
                if (arimaParams) {
                    throw new Error(`La configuración ARIMA manual (p=${arimaParams.p}, d=${arimaParams.d}, q=${arimaParams.q}) no produjo resultados válidos`);
                }
                console.warn('\n⚠️  Ninguna config ARIMA funcionó, usando tendencia lineal como fallback');
                return ArimaService.linearFallback(dataset, steps);
            }

            if (!arimaParams) {
                console.log(`\n[6] MODELO GANADOR: ARIMA(${bestConfig!.p},${bestConfig!.d},${bestConfig!.q})`);
                console.log(`  MSE de validación: ${minError.toFixed(6)}`);
                console.log(`  Reentrenado con todos los ${normalizedData.length} puntos para la predicción final`);
            }

            // ── PREDICCIONES NORMALIZADAS ──────────────────────────────
            console.log(`\n[${arimaParams ? '3' : '7'}] PREDICCIONES (espacio normalizado z-score):`);
            console.log(`  [${bestPredictions.map((v: number) => v.toFixed(4)).join(', ')}]`);

            // ── DESNORMALIZACIÓN ───────────────────────────────────────
            const denormalized = bestPredictions.map((v: number) => v * std + mean);

            console.log(`\n[${arimaParams ? '4' : '8'}] DESNORMALIZACIÓN: pred_real = pred_norm × ${std.toFixed(4)} + ${mean.toFixed(4)}`);
            console.log(`  [${denormalized.map(v => v.toFixed(4)).join(', ')}]`);

            // Sin clipping para params manuales
            if (arimaParams) {
                const final = denormalized.map(pred => Math.round(pred * 100) / 100);
                console.log(`\n  Modo manual → SIN clipping`);
                console.log(`  Predicciones finales: [${final.join(', ')}]`);
                console.log('\n╔══════════════════════════════════════════════════════════');
                console.log('║  ARIMA FORECAST — FIN (modo manual)');
                console.log('╚══════════════════════════════════════════════════════════\n');
                return final;
            }

            // Clipping ±150% para automático
            const minData = Math.min(...dataset);
            const maxData = Math.max(...dataset);
            const range   = maxData - minData;
            const clipLow  = minData - range * 1.5;
            const clipHigh = maxData + range * 1.5;

            const final = denormalized.map(pred =>
                Math.round(Math.max(clipLow, Math.min(clipHigh, pred)) * 100) / 100
            );

            console.log(`\n[9] CLIPPING ±150% del rango histórico`);
            console.log(`  límite inferior: ${clipLow.toFixed(4)}`);
            console.log(`  límite superior: ${clipHigh.toFixed(4)}`);
            console.log(`  Predicciones finales: [${final.join(', ')}]`);
            console.log('\n╔══════════════════════════════════════════════════════════');
            console.log('║  ARIMA FORECAST — FIN (modo automático)');
            console.log('╚══════════════════════════════════════════════════════════\n');

            return final;

        } catch (error) {
            console.error('Error en ARIMA:', error);
            if (arimaParams) throw error;
            return ArimaService.linearFallback(dataset, steps);
        }
    }

    private static linearFallback(dataset: number[], steps: number): number[] {
        const last  = dataset[dataset.length - 1];
        const trend = (dataset[dataset.length - 1] - dataset[Math.max(0, dataset.length - 5)]) / Math.min(5, dataset.length);
        console.log(`  Fallback lineal: último valor=${last}, pendiente=${trend.toFixed(4)}`);
        return Array.from({ length: steps }, (_, i) => Math.round((last + trend * (i + 1)) * 100) / 100);
    }
}
