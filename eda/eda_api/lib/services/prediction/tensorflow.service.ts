import * as tf from '@tensorflow/tfjs';

export class TensorflowService {

    /**
     * Punto de entrada principal.
     * Decide si usar params manuales (LSTM fijo) o automáticos (con fallback).
     */
    static async forecast(dataset: number[], steps: number, tfParams?: {epochs: number, lookback: number, learningRate: number}, referenceDatasets?: number[][]): Promise<number[]> {
        console.log('\n╔══════════════════════════════════════════════════════════');
        console.log('║  TENSORFLOW FORECAST — INICIO');
        console.log('╠══════════════════════════════════════════════════════════');
        console.log(`║  Puntos en el dataset:   ${dataset.length}`);
        console.log(`║  Steps a predecir:       ${steps}`);
        console.log(`║  Columnas de referencia: ${referenceDatasets ? referenceDatasets.length : 0}`);
        console.log(`║  Modo:                   ${tfParams ? 'MANUAL (params usuario)' : 'AUTOMÁTICO'}`);
        if (tfParams) {
            console.log(`║  Épocas (manual):        ${tfParams.epochs}`);
            console.log(`║  Lookback (manual):      ${tfParams.lookback}`);
            console.log(`║  Learning rate (manual): ${tfParams.learningRate}`);
        }
        console.log(`║  Dataset (primeros 5):   [${dataset.slice(0, 5).join(', ')}${dataset.length > 5 ? ', ...' : ''}]`);
        console.log(`║  Dataset (últimos 5):    [${dataset.slice(-5).join(', ')}]`);
        console.log('╚══════════════════════════════════════════════════════════\n');

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
            return await TensorflowService.lstmForecast(dataset, steps, undefined, referenceDatasets);
        } catch (err) {
            console.warn('\n⚠️  LSTM falló, usando red densa como fallback:', (err as Error).message);
            try {
                return await TensorflowService.denseForecast(dataset, steps);
            } catch (err2) {
                console.warn('\n⚠️  Red densa falló, usando tendencia lineal:', (err2 as Error).message);
                return TensorflowService.linearFallback(dataset, steps);
            }
        }
    }

    /**
     * Modelo LSTM con salida directa multi-paso.
     *
     * Mejoras aplicadas:
     *  - Dropout(0.2) tras LSTM: evita overfitting con pocas muestras (ambos modos)
     *  - Early stopping (patience 15 manual / 10 auto): para cuando el loss converge (ambos modos)
     *  - Fórmula de épocas auto corregida: más muestras → más épocas, no menos (solo auto)
     *  - Salida directa multi-paso: nunca se alimenta de sus propias predicciones (ambos modos)
     */
    private static async lstmForecast(
        dataset: number[],
        steps: number,
        tfParams?: {epochs: number, lookback: number, learningRate: number},
        referenceDatasets?: number[][]
    ): Promise<number[]> {
        console.log('\n┌─────────────────────────────────────────────────────────');
        console.log('│  LSTM FORECAST');
        console.log('└─────────────────────────────────────────────────────────');

        const useMultivariate = referenceDatasets && referenceDatasets.length > 0;
        const numFeatures = 1 + (useMultivariate ? referenceDatasets!.length : 0);

        console.log(`\n[1/7] MODO: ${useMultivariate ? `MULTIVARIANTE (${numFeatures} features: target + ${referenceDatasets!.length} refs)` : 'UNIVARIANTE (1 feature: solo target)'}`);

        // ── NORMALIZACIÓN ──────────────────────────────────────────────
        const { normalized: normTarget, min, max } = TensorflowService.normalize(dataset);
        const normRefs: number[][] = useMultivariate
            ? referenceDatasets!.map(ref => TensorflowService.normalize(ref).normalized)
            : [];

        console.log('\n[2/7] NORMALIZACIÓN (min-max → rango [0, 1])');
        console.log(`  TARGET  min=${min}  max=${max}  rango=${max - min}`);
        console.log(`  fórmula: valor_norm = (valor - min) / (max - min)`);
        console.log(`  normalizados (primeros 5): [${normTarget.slice(0, 5).map(v => v.toFixed(4)).join(', ')}${normTarget.length > 5 ? ', ...' : ''}]`);
        console.log(`  normalizados (últimos 5):  [${normTarget.slice(-5).map(v => v.toFixed(4)).join(', ')}]`);
        if (useMultivariate) {
            referenceDatasets!.forEach((refOrig, i) => {
                const refMin = Math.min(...refOrig);
                const refMax = Math.max(...refOrig);
                console.log(`  REF[${i}]  min=${refMin}  max=${refMax}  rango=${refMax - refMin}`);
                console.log(`         normalizados (últimos 5): [${normRefs[i].slice(-5).map(v => v.toFixed(4)).join(', ')}]`);
            });
        }

        // ── CORRELACIÓN Y FILTRADO DE REFERENCIAS ─────────────────────
        const pearsonValues: number[] = [];
        if (useMultivariate) {
            console.log('\n[2b/7] CORRELACION DE ATRIBUTOS DE REFERENCIA');
            console.log('  Correlacion de Pearson con el TARGET:');
            console.log('  (-1 = inversa total | 0 = sin relacion | +1 = directa total)');
            console.log('  ─────────────────────────────────────────────────────────────');

            const targetMean = dataset.reduce((a, b) => a + b, 0) / dataset.length;
            const targetStd  = Math.sqrt(dataset.reduce((s, v) => s + (v - targetMean) ** 2, 0) / dataset.length) || 1;

            referenceDatasets!.forEach((refOrig, i) => {
                const n = Math.min(dataset.length, refOrig.length);
                const refMean = refOrig.reduce((a, b) => a + b, 0) / refOrig.length;
                const refStd  = Math.sqrt(refOrig.reduce((s, v) => s + (v - refMean) ** 2, 0) / refOrig.length) || 1;

                const pearson = refOrig.slice(0, n).reduce((sum, rv, idx) => {
                    return sum + ((dataset[idx] - targetMean) / targetStd) * ((rv - refMean) / refStd);
                }, 0) / n;

                pearsonValues.push(pearson);

                const absP = Math.abs(pearson);
                const strength = absP >= 0.7 ? 'ALTA' : absP >= 0.4 ? 'MODERADA' : absP >= 0.15 ? 'BAJA' : 'MUY BAJA';
                const warning  = absP < 0.15 ? '  << correlacion muy baja, puede aportar ruido' : '';

                console.log(`  REF[${i}]  Pearson = ${pearson.toFixed(4)}  |  ${strength}${warning}`);

                const showN = Math.min(8, n);
                const targetLast = dataset.slice(-showN);
                const refLast    = refOrig.slice(-showN);
                console.log(`         Ultimos ${showN} pares (target | ref[${i}]):`);
                targetLast.forEach((tv, idx) => {
                    console.log(`           [${idx + 1}]  ${tv}  |  ${refLast[idx]}`);
                });
            });

            console.log('  ─────────────────────────────────────────────────────────────');
            console.log(`  Todas las referencias entran al modelo. Atributos con correlacion baja pueden aportar ruido.`);
        }


        // ── WINDOW SIZE ────────────────────────────────────────────────
        let windowSize = tfParams?.lookback
            ? Math.min(tfParams.lookback, normTarget.length - 1)
            : Math.min(Math.max(5, Math.floor(normTarget.length / 10)), 60);

        const windowSizeRaw = windowSize;
        windowSize = Math.min(windowSize, Math.max(2, normTarget.length - steps - 1));

        console.log('\n[3/7] WINDOW SIZE (ventana de entrada al modelo)');
        if (tfParams?.lookback) {
            console.log(`  lookback manual:             ${tfParams.lookback}`);
            console.log(`  limitado a dataset.length-1: min(${tfParams.lookback}, ${normTarget.length - 1}) = ${windowSizeRaw}`);
        } else {
            console.log(`  cálculo auto:               min(max(5, floor(${normTarget.length}/10)), 60)`);
            console.log(`                            = min(max(5, ${Math.floor(normTarget.length / 10)}), 60) = ${windowSizeRaw}`);
        }
        console.log(`  ajuste para tener al menos 1 muestra de entrenamiento:`);
        console.log(`    max(2, dataset.length - steps - 1) = max(2, ${normTarget.length} - ${steps} - 1) = ${Math.max(2, normTarget.length - steps - 1)}`);
        console.log(`    windowSize final = min(${windowSizeRaw}, ${Math.max(2, normTarget.length - steps - 1)}) = ${windowSize}`);

        if (normTarget.length < windowSize + steps + 1) {
            console.log(`\n❌ Dataset insuficiente: ${normTarget.length} < ${windowSize} + ${steps} + 1 = ${windowSize + steps + 1}`);
            throw new Error('Dataset demasiado corto para predicción directa LSTM con los steps indicados');
        }

        // ── VENTANAS DE ENTRENAMIENTO ──────────────────────────────────
        const xs: number[][][] = [];
        const ys: number[][] = [];

        for (let i = 0; i <= normTarget.length - windowSize - steps; i++) {
            const windowVectors: number[][] = [];
            for (let t = i; t < i + windowSize; t++) {
                const vec = [normTarget[t]];
                normRefs.forEach(ref => vec.push(ref[t]));
                windowVectors.push(vec);
            }
            xs.push(windowVectors);
            ys.push(normTarget.slice(i + windowSize, i + windowSize + steps));
        }

        console.log('\n[4/7] MUESTRAS DE ENTRENAMIENTO');
        console.log(`  loop: i = 0 hasta ${normTarget.length} - ${windowSize} - ${steps} = ${normTarget.length - windowSize - steps}`);
        console.log(`  total muestras generadas: ${xs.length}`);
        console.log(`  shape input tensor:  [${xs.length}, ${windowSize}, ${numFeatures}]  (muestras × timesteps × features)`);
        console.log(`  shape output tensor: [${xs.length}, ${steps}]  (muestras × steps a predecir)`);
        if (xs.length > 0) {
            console.log(`  muestra[0] input  (normalizados): ${JSON.stringify(xs[0].map(v => v.map(x => +x.toFixed(4))))}`);
            console.log(`  muestra[0] target (normalizados): [${ys[0].map(v => v.toFixed(4)).join(', ')}]`);
            if (xs.length > 1) {
                console.log(`  muestra[${xs.length - 1}] input  (normalizados): ${JSON.stringify(xs[xs.length - 1].map(v => v.map(x => +x.toFixed(4))))}`);
                console.log(`  muestra[${xs.length - 1}] target (normalizados): [${ys[ys.length - 1].map(v => v.toFixed(4)).join(', ')}]`);
            }
        }

        const inputTensor = tf.tensor3d(xs);
        const outputTensor = tf.tensor2d(ys);

        // ── ARQUITECTURA Y PARÁMETROS ──────────────────────────────────
        const lstmUnits    = tfParams ? 64 : 32;
        const batchSize    = Math.min(32, xs.length);
        const learningRate = tfParams?.learningRate || 0.01;
        const patience     = tfParams ? 15 : 10;

        // Fórmula de épocas corregida para automático:
        //   Objetivo: ~500 pasos de gradiente totales
        //   Pasos por época = ceil(muestras / batchSize)
        //   Épocas necesarias = ceil(500 / pasos_por_epoch)
        //   Con pocas muestras → más épocas; con muchas → menos (correcto)
        const stepsPerEpoch    = Math.ceil(xs.length / batchSize);
        const epochsAuto       = Math.min(300, Math.max(50, Math.ceil(500 / stepsPerEpoch)));
        const epochs           = tfParams?.epochs || epochsAuto;

        console.log('\n[5/7] ARQUITECTURA Y ENTRENAMIENTO');
        console.log(`  Capa 1: LSTM(units=${lstmUnits}, inputShape=[${windowSize}, ${numFeatures}])`);
        console.log(`  Capa 2: Dropout(rate=0.2)  ← evita overfitting (ambos modos)`);
        if (tfParams) {
            console.log(`  Capa 3: Dense(units=32, activation=relu)  ← capa extra por params manuales`);
            console.log(`  Capa 4: Dense(units=${steps})  ← salida directa (${steps} valores a la vez)`);
        } else {
            console.log(`  Capa 3: Dense(units=${steps})  ← salida directa (${steps} valores a la vez)`);
        }
        console.log(`  Optimizer:  Adam(lr=${learningRate})`);
        console.log(`  Loss:       MSE (Mean Squared Error)`);
        if (tfParams?.epochs) {
            console.log(`  Épocas:     ${epochs}  ← manual`);
        } else {
            console.log(`  Épocas:     ${epochs}  ← auto corregido:`);
            console.log(`              stepsPerEpoch = ceil(${xs.length}/${batchSize}) = ${stepsPerEpoch}`);
            console.log(`              epochs = min(300, max(50, ceil(500/${stepsPerEpoch}))) = ${epochsAuto}`);
        }
        console.log(`  Batch size: ${batchSize}  ← min(32, ${xs.length} muestras)`);
        console.log(`  Early stopping: patience=${patience}  ← para cuando el loss no mejora en ${patience} épocas consecutivas`);

        // Seed fijo → resultados reproducibles entre ejecuciones
        const SEED = 42;

        const model = tf.sequential();
        model.add(tf.layers.lstm({
            units: lstmUnits,
            inputShape: [windowSize, numFeatures],
            returnSequences: false,
            kernelInitializer: tf.initializers.glorotUniform({ seed: SEED }),
            recurrentInitializer: tf.initializers.orthogonal({ seed: SEED }),
            biasInitializer: 'zeros',
        }));
        // Dropout tras LSTM: en cada epoch desactiva aleatoriamente el 20% de neuronas
        // Fuerza al modelo a aprender patrones robustos, no a memorizar las muestras
        model.add(tf.layers.dropout({ rate: 0.2, seed: SEED }));
        if (tfParams) {
            model.add(tf.layers.dense({ units: 32, activation: 'relu', kernelInitializer: tf.initializers.glorotUniform({ seed: SEED }) }));
        }
        model.add(tf.layers.dense({ units: steps, kernelInitializer: tf.initializers.glorotUniform({ seed: SEED }) }));

        model.compile({
            optimizer: tf.train.adam(learningRate),
            loss: 'meanSquaredError'
        });

        const earlyStop = tf.callbacks.earlyStopping({ monitor: 'loss', patience, verbose: 0 });

        console.log(`\n  Entrenando...`);
        const history = await model.fit(inputTensor, outputTensor, {
            epochs,
            batchSize,
            shuffle: false,  // sin shuffle → orden de batches determinista
            verbose: 0,
            callbacks: [earlyStop]
        });

        const losses        = history.history['loss'] as number[];
        const actualEpochs  = losses.length;
        const stoppedEarly  = actualEpochs < epochs;
        const firstLoss     = losses[0];
        const lastLoss      = losses[actualEpochs - 1];

        console.log(`  Épocas ejecutadas:  ${actualEpochs}/${epochs}${stoppedEarly ? `  ← early stopping activado en época ${actualEpochs}` : '  (completadas)'}`);
        console.log(`  Loss inicial (época 1):         ${firstLoss.toFixed(6)}`);
        console.log(`  Loss final   (época ${actualEpochs}): ${lastLoss.toFixed(6)}`);
        console.log(`  Reducción de loss:              ${((1 - lastLoss / firstLoss) * 100).toFixed(1)}%`);
        if (stoppedEarly) {
            console.log(`  ℹ️  El modelo convergió antes de llegar al máximo de épocas — buena señal.`);
        }

        // ── VENTANA FINAL (DATOS REALES) ───────────────────────────────
        const lastWindow: number[][] = normTarget.slice(-windowSize).map((v, idx) => {
            const vec = [v];
            normRefs.forEach(ref => vec.push(ref[ref.length - windowSize + idx]));
            return vec;
        });

        console.log('\n[6/7] VENTANA DE PREDICCIÓN (última ventana de datos REALES)');
        console.log(`  Tamaño de la ventana: ${windowSize} timesteps`);
        console.log(`  ⚠️  Esta es la ÚNICA entrada al modelo — no se usa ninguna predicción previa`);
        console.log(`\n  Timestep │ TARGET (real)  TARGET (norm)${useMultivariate ? referenceDatasets!.map((_, i) => `  REF[${i}] (real)  REF[${i}] (norm)`).join('') : ''}`);
        console.log(`  ${'─'.repeat(useMultivariate ? 60 + referenceDatasets!.length * 30 : 40)}`);
        const targetWindow = dataset.slice(-windowSize);
        lastWindow.forEach((vec, idx) => {
            const realTarget = targetWindow[idx];
            const normT      = vec[0].toFixed(4);
            let row = `  [t-${String(windowSize - idx).padStart(2, '0')}]   │ ${String(realTarget).padStart(14)}  ${normT.padStart(12)}`;
            if (useMultivariate) {
                referenceDatasets!.forEach((refOrig, ri) => {
                    const realRef = refOrig[refOrig.length - windowSize + idx];
                    const normRef = vec[ri + 1].toFixed(4);
                    row += `  ${String(realRef).padStart(14)}  ${normRef.padStart(12)}`;
                });
            }
            console.log(row);
        });
        if (useMultivariate) {
            console.log(`\n  Cada fila es un vector de entrada: [target_norm${referenceDatasets!.map((_, i) => `, ref[${i}]_norm`).join('')}]`);
            console.log(`  El modelo recibe ${windowSize} vectores de ${numFeatures} dimensiones → shape [1, ${windowSize}, ${numFeatures}]`);
        }

        // ── PREDICCIÓN ─────────────────────────────────────────────────
        const inputFinal = tf.tensor3d([lastWindow]);
        const predTensor = model.predict(inputFinal) as tf.Tensor;
        const predictions = Array.from(predTensor.dataSync());
        predTensor.dispose();

        // ── PESO DE ATRIBUTOS DE REFERENCIA (impacto por neutralización) ──
        if (useMultivariate) {
            console.log('\n[6b/7] PESO DE ATRIBUTOS DE REFERENCIA');
            console.log('  Método: neutralización — cada feature se reemplaza por 0.5 (punto medio normalizado)');
            console.log('  y se mide el cambio absoluto medio en las predicciones respecto a la predicción base.');
            console.log('  Un peso alto = el modelo depende mucho de ese atributo.\n');

            const impacts: number[] = [];
            for (let ri = 0; ri < normRefs.length; ri++) {
                const windowNeutralized = lastWindow.map(vec => {
                    const newVec = [...vec];
                    newVec[ri + 1] = 0.5; // neutralizar esta referencia al punto medio
                    return newVec;
                });
                const inputNeutralized = tf.tensor3d([windowNeutralized]);
                const neutralTensor = model.predict(inputNeutralized) as tf.Tensor;
                const neutralPred = Array.from(neutralTensor.dataSync());
                inputNeutralized.dispose();
                neutralTensor.dispose();

                const impact = predictions.reduce((sum, v, i) => sum + Math.abs(v - neutralPred[i]), 0) / predictions.length;
                impacts.push(impact);
            }

            const totalImpact = impacts.reduce((a, b) => a + b, 0) || 1;
            console.log('  Atributo   Impacto absoluto   Peso relativo   Visual');
            console.log('  ────────────────────────────────────────────────────────');
            referenceDatasets!.forEach((_, ri) => {
                const pct = (impacts[ri] / totalImpact * 100);
                const bar = '█'.repeat(Math.max(1, Math.round(pct / 5)));
                console.log(`  REF[${ri}]     ${impacts[ri].toFixed(6)}           ${pct.toFixed(1).padStart(5)}%   ${bar}`);
            });
            console.log('  ────────────────────────────────────────────────────────');
            console.log('  ℹ️  Peso relativo: % del impacto total sobre la predicción final.');
        }

        inputFinal.dispose();
        inputTensor.dispose();
        outputTensor.dispose();
        model.dispose();

        console.log('\n[7/7] RESULTADOS');
        console.log(`  Predicciones RAW (normalizadas, espacio [0,1]):`);
        console.log(`    [${predictions.map(v => v.toFixed(6)).join(', ')}]`);

        const denormalized = TensorflowService.denormalize(predictions, min, max);
        console.log(`\n  Desnormalización: pred_real = pred_norm × (${max} - ${min}) + ${min}`);
        console.log(`  Predicciones desnormalizadas:`);
        console.log(`    [${denormalized.map(v => v.toFixed(4)).join(', ')}]`);

        if (tfParams) {
            const final = denormalized.map(pred => Math.round(pred * 100) / 100);
            console.log(`\n  Modo manual → SIN clipping aplicado`);
            console.log(`  Predicciones finales:`);
            console.log(`    [${final.join(', ')}]`);
            console.log('\n╔══════════════════════════════════════════════════════════');
            console.log('║  TENSORFLOW FORECAST — FIN (LSTM, modo manual)');
            console.log('╚══════════════════════════════════════════════════════════\n');
            return final;
        }

        const validated = TensorflowService.validatePredictions(denormalized, dataset);
        console.log(`\n  Modo automático → Clipping ±150% del rango histórico`);
        console.log(`    límite inferior: ${Math.min(...dataset) - (Math.max(...dataset) - Math.min(...dataset)) * 1.5}`);
        console.log(`    límite superior: ${Math.max(...dataset) + (Math.max(...dataset) - Math.min(...dataset)) * 1.5}`);
        console.log(`  Predicciones finales (tras clipping):`);
        console.log(`    [${validated.join(', ')}]`);
        console.log('\n╔══════════════════════════════════════════════════════════');
        console.log('║  TENSORFLOW FORECAST — FIN (LSTM, modo automático)');
        console.log('╚══════════════════════════════════════════════════════════\n');
        return validated;
    }

    /**
     * Fallback 1: Red neuronal densa con salida directa multi-paso.
     * También incluye Dropout y Early Stopping.
     */
    private static async denseForecast(dataset: number[], steps: number): Promise<number[]> {
        console.log('\n┌─────────────────────────────────────────────────────────');
        console.log('│  DENSE FORECAST (fallback 1)');
        console.log('└─────────────────────────────────────────────────────────');

        const { normalized, min, max } = TensorflowService.normalize(dataset);

        console.log(`\n[1/5] NORMALIZACIÓN`);
        console.log(`  min=${min}, max=${max}, rango=${max - min}`);

        let windowSize = Math.min(Math.max(3, Math.floor(dataset.length / 10)), 40);
        const windowSizeRaw = windowSize;
        windowSize = Math.min(windowSize, Math.max(2, normalized.length - steps - 1));

        console.log(`\n[2/5] WINDOW SIZE`);
        console.log(`  cálculo auto: min(max(3, floor(${dataset.length}/10)), 40) = ${windowSizeRaw}`);
        console.log(`  ajuste:       min(${windowSizeRaw}, max(2, ${normalized.length}-${steps}-1)) = ${windowSize}`);

        if (normalized.length < windowSize + steps + 1) {
            console.log(`\n❌ Dataset insuficiente: ${normalized.length} < ${windowSize + steps + 1}`);
            throw new Error('Dataset demasiado corto para red densa directa');
        }

        const xs: number[][] = [];
        const ys: number[][] = [];
        for (let i = 0; i <= normalized.length - windowSize - steps; i++) {
            xs.push(normalized.slice(i, i + windowSize));
            ys.push(normalized.slice(i + windowSize, i + windowSize + steps));
        }

        const batchSize     = Math.min(32, xs.length);
        const stepsPerEpoch = Math.ceil(xs.length / batchSize);
        const epochs        = Math.min(300, Math.max(50, Math.ceil(500 / stepsPerEpoch)));

        console.log(`\n[3/5] MUESTRAS: ${xs.length}  shape input=[${xs.length},${windowSize}]  shape output=[${xs.length},${steps}]`);
        console.log(`\n[4/5] ENTRENAMIENTO: Dense(16,relu) → Dropout(0.2) → Dense(8,relu) → Dense(${steps})`);
        console.log(`  epochs=${epochs} (auto corregido)  early stopping patience=10`);

        const inputTensor = tf.tensor2d(xs);
        const outputTensor = tf.tensor2d(ys);

        const SEED = 42;

        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [windowSize], kernelInitializer: tf.initializers.glorotUniform({ seed: SEED }) }));
        model.add(tf.layers.dropout({ rate: 0.2, seed: SEED }));
        model.add(tf.layers.dense({ units: 8, activation: 'relu', kernelInitializer: tf.initializers.glorotUniform({ seed: SEED }) }));
        model.add(tf.layers.dense({ units: steps, kernelInitializer: tf.initializers.glorotUniform({ seed: SEED }) }));

        model.compile({ optimizer: tf.train.adam(0.01), loss: 'meanSquaredError' });

        const earlyStop = tf.callbacks.earlyStopping({ monitor: 'loss', patience: 10, verbose: 0 });

        const history = await model.fit(inputTensor, outputTensor, {
            epochs,
            batchSize,
            shuffle: false,
            verbose: 0,
            callbacks: [earlyStop]
        });

        const losses       = history.history['loss'] as number[];
        const actualEpochs = losses.length;
        console.log(`  Épocas ejecutadas: ${actualEpochs}/${epochs}${actualEpochs < epochs ? ' (early stopping)' : ''}`);
        console.log(`  Loss inicial: ${losses[0].toFixed(6)}  →  Loss final: ${losses[actualEpochs - 1].toFixed(6)}`);

        const lastWindow = normalized.slice(-windowSize);
        console.log(`\n[5/5] VENTANA ENTRADA (normalizados): [${lastWindow.map(v => v.toFixed(4)).join(', ')}]`);
        console.log(`  Datos reales correspondientes:        [${dataset.slice(-windowSize).join(', ')}]`);

        const input = tf.tensor2d([lastWindow]);
        const pred = model.predict(input) as tf.Tensor;
        const predictions = Array.from(pred.dataSync());

        input.dispose();
        pred.dispose();
        inputTensor.dispose();
        outputTensor.dispose();
        model.dispose();

        const denormalized = TensorflowService.denormalize(predictions, min, max);
        const validated    = TensorflowService.validatePredictions(denormalized, dataset);

        console.log(`  Predicciones RAW (normalizadas):  [${predictions.map(v => v.toFixed(4)).join(', ')}]`);
        console.log(`  Predicciones desnormalizadas:     [${denormalized.map(v => v.toFixed(4)).join(', ')}]`);
        console.log(`  Predicciones finales (±150%):     [${validated.join(', ')}]`);

        return validated;
    }

    /**
     * Fallback 2: Tendencia lineal por mínimos cuadrados.
     */
    private static linearFallback(dataset: number[], steps: number): number[] {
        console.log('\n┌─────────────────────────────────────────────────────────');
        console.log('│  LINEAR FALLBACK (fallback 2)');
        console.log('└─────────────────────────────────────────────────────────');

        const windowSize = Math.min(10, dataset.length);
        const recentData = dataset.slice(-windowSize);
        const n    = recentData.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = recentData.reduce((a, b) => a + b, 0);
        const sumXY = recentData.reduce((sum, y, i) => sum + i * y, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const last  = dataset[dataset.length - 1];

        console.log(`\n  Datos usados (últimos ${windowSize}): [${recentData.join(', ')}]`);
        console.log(`  n=${n}, sumX=${sumX}, sumY=${sumY.toFixed(4)}, sumXY=${sumXY.toFixed(4)}, sumX2=${sumX2}`);
        console.log(`  pendiente = (${n}×${sumXY.toFixed(4)} - ${sumX}×${sumY.toFixed(4)}) / (${n}×${sumX2} - ${sumX}²) = ${slope.toFixed(6)}`);
        console.log(`  último valor real: ${last}`);
        console.log(`  fórmula: predicción[i] = ${last} + ${slope.toFixed(6)} × (i+1)`);

        const result = Array.from({ length: steps }, (_, i) => Math.round((last + slope * (i + 1)) * 100) / 100);

        console.log(`  Predicciones: [${result.join(', ')}]`);
        console.log('\n╔══════════════════════════════════════════════════════════');
        console.log('║  TENSORFLOW FORECAST — FIN (linear fallback)');
        console.log('╚══════════════════════════════════════════════════════════\n');

        return result;
    }

    private static normalize(data: number[]): { normalized: number[], min: number, max: number } {
        const min   = Math.min(...data);
        const max   = Math.max(...data);
        const range = max - min || 1;
        return { normalized: data.map(v => (v - min) / range), min, max };
    }

    private static denormalize(data: number[], min: number, max: number): number[] {
        const range = max - min || 1;
        return data.map(v => v * range + min);
    }

    private static validatePredictions(predictions: number[], originalDataset: number[]): number[] {
        const minData = Math.min(...originalDataset);
        const maxData = Math.max(...originalDataset);
        const range   = maxData - minData;
        return predictions
            .map(pred => Math.max(minData - range * 1.5, Math.min(maxData + range * 1.5, pred)))
            .map(pred => Math.round(pred * 100) / 100);
    }
}
