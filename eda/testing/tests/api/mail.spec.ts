import { test, expect } from '../fixtures/base';

/**
 * /mail/save escribe la configuracion SMTP real que usa la app en produccion/dev
 * (un fichero de config compartido), asi que deliberadamente NO se prueba aqui:
 * hacerlo cambiaria el correo saliente real de la instalacion que el usuario esta
 * usando. Solo se prueba /mail/check (que no persiste nada) y los guards de permiso.
 */
test.describe('Mail (/mail)', () => {
    test('comprobar una configuracion SMTP inalcanzable falla de forma controlada, sin crashear', async ({ api }) => {
        const res = await api.post('/mail/check', {
            configType: 'SMPT',
            host: '127.0.0.1',
            port: 1,
            secure: false,
            auth: { user: 'test@eda-tests.local', pass: 'no-importa' },
        });
        expect(res.ok()).toBeFalsy();
        expect(res.status()).toBeLessThan(600);
        const body = await res.json().catch(() => null);
        expect(body).toBeTruthy();
    });

    test('un usuario limitado no puede leer las credenciales de correo (403)', async ({ apiAsLimitedUser }) => {
        const res = await apiAsLimitedUser.get('/mail/credentials');
        expect(res.status()).toBe(403);
    });

    test('un usuario limitado no puede comprobar la config de correo (403)', async ({ apiAsLimitedUser }) => {
        const res = await apiAsLimitedUser.post('/mail/check', { host: 'x' });
        expect(res.status()).toBe(403);
    });

    test('un usuario limitado no puede guardar credenciales de correo (403)', async ({ apiAsLimitedUser }) => {
        const res = await apiAsLimitedUser.post('/mail/save', { host: 'x' });
        expect(res.status()).toBe(403);
    });

    test('el admin puede leer la configuracion de credenciales actual', async ({ api }) => {
        const res = await api.get('/mail/credentials');
        expect(res.ok()).toBeTruthy();
    });
});
