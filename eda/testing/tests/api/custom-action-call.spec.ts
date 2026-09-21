import { test, expect } from '../fixtures/base';
import { ENV } from '../../utils/env';

test.describe('Custom Action Call (/customActionCall/check)', () => {
    test('comprobar una URL alcanzable (la propia API) devuelve ok:true', async ({ api }) => {
        const res = await api.post('/customActionCall/check', { url: `${ENV.apiBaseURL}/auth/typeLogin` });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.ok).toBeTruthy();
    });

    test('comprobar una URL inalcanzable devuelve ok:false, no un crash', async ({ api }) => {
        const res = await api.post('/customActionCall/check', { url: 'http://127.0.0.1:1/no-hay-nadie-escuchando' });
        // El controlador responde 500 con {ok:false} para errores de conexion; en cualquier
        // caso no debe devolver 2xx con ok:true, ni tirar la conexion sin respuesta.
        const body = await res.json().catch(() => null);
        expect(body?.ok).not.toBe(true);
    });

    test('un usuario sin rol admin no puede usar customActionCall (403)', async ({ apiAsLimitedUser }) => {
        const res = await apiAsLimitedUser.post('/customActionCall/check', { url: ENV.apiBaseURL });
        expect(res.status()).toBe(403);
    });
});
