import { test, expect } from '../fixtures/base';

const SERIES = [10, 12, 13, 12, 15, 17, 16, 19, 21, 20, 23, 25];

test.describe('Predicciones (/arima)', () => {
    test('ARIMA genera el numero de pasos solicitado, con valores numericos', async ({ api }) => {
        const res = await api.post('/arima/predict', { dataset: SERIES, steps: 3, p: 1, d: 1, q: 1 });
        expect(res.ok(), await res.text()).toBeTruthy();
        const body = await res.json();
        expect(body.ok).toBeTruthy();
        expect(Array.isArray(body.predictions)).toBeTruthy();
        expect(body.predictions.length).toBe(3);
        for (const v of body.predictions) expect(typeof v).toBe('number');
    });

    test('ARIMA con dataset invalido devuelve 400', async ({ api }) => {
        const res = await api.post('/arima/predict', { dataset: 'no-es-un-array', steps: 3 });
        expect(res.status()).toBe(400);
    });

    test('TensorFlow genera el numero de pasos solicitado', async ({ api }) => {
        const res = await api.post('/arima/tensorflow/predict', { dataset: SERIES, steps: 2, epochs: 5 });
        expect(res.ok(), await res.text()).toBeTruthy();
        const body = await res.json();
        expect(body.ok).toBeTruthy();
        expect(body.predictions.length).toBe(2);
    });

    test('TensorFlow con dataset invalido devuelve 400', async ({ api }) => {
        const res = await api.post('/arima/tensorflow/predict', { dataset: null, steps: 2 });
        expect(res.status()).toBe(400);
    });

    test('predecir sin token devuelve 401', async ({ apiAnonymous }) => {
        const res = await apiAnonymous.post('/arima/predict', { dataset: SERIES, steps: 1 });
        expect(res.status()).toBe(401);
    });
});
