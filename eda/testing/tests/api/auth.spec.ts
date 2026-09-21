import { test, expect } from '../fixtures/base';
import { ENV } from '../../utils/env';

test.describe('Autenticacion (/auth, /admin/user/login)', () => {
    test('GET /auth/typeLogin responde con la configuracion de login activa, sin token', async ({ apiAnonymous }) => {
        const res = await apiAnonymous.get('/auth/typeLogin');
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toBeTruthy();
    });

    test('login con credenciales validas devuelve token + usuario', async ({ adminSession }) => {
        expect(adminSession.token).toBeTruthy();
        expect(adminSession.email).toContain('@eda-tests.local');
    });

    test('login con password incorrecta devuelve 400', async ({ apiAnonymous, adminSession }) => {
        const res = await apiAnonymous.post('/admin/user/login', {
            email: adminSession.email,
            password: 'contraseña-incorrecta-xyz',
        });
        expect(res.status()).toBe(400);
        const body = await res.json();
        expect(body.message).toBeTruthy();
    });

    test('login con usuario inexistente devuelve error, no 200', async ({ apiAnonymous }) => {
        const res = await apiAnonymous.post('/admin/user/login', {
            email: 'usuario-que-no-existe-xyz@eda-tests.local',
            password: 'lo-que-sea',
        });
        expect(res.ok()).toBeFalsy();
    });

    test('un endpoint protegido sin token devuelve 401 "Token required"', async ({ apiAnonymous }) => {
        const res = await apiAnonymous.get('/admin/user');
        expect(res.status()).toBe(401);
        const body = await res.json();
        expect(body.message).toMatch(/token/i);
    });

    test('un endpoint protegido con token invalido devuelve 401 "Invalid Token"', async ({ request }) => {
        const res = await request.get(`${ENV.apiBaseURL}/admin/user?token=esto-no-es-un-jwt-valido`);
        expect(res.status()).toBe(401);
        const body = await res.json();
        expect(body.message).toMatch(/invalid/i);
    });

    test('refresh-token devuelve un nuevo token valido', async ({ api }) => {
        const res = await api.get('/admin/user/refresh-token');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.token).toBeTruthy();
        expect(body.token).not.toBe('');
    });
});
