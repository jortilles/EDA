import { test, expect } from '../fixtures/base';

test.describe('Logs del servidor (/admin/log)', () => {
    test('sin token, se rechaza con 401', async ({ apiAnonymous }) => {
        const res = await apiAnonymous.get('/admin/log/log-file');
        expect(res.status()).toBe(401);
    });

    /**
     * /admin/log/log-file y /admin/log/log-error-file (log.router.ts) llevan
     * [authGuard, roleGuard] -- un usuario autenticado sin rol admin recibe 403.
     * (Esto documentaba antes un hallazgo de control de acceso roto; ya esta corregido
     * en log.router.ts, igual que la ruta de frontend equivalente, ver
     * tests/e2e/permissions-ui.spec.ts.)
     */
    test('[seguridad] un usuario SIN rol admin no puede leer los logs del servidor', async ({ apiAsLimitedUser }) => {
        const res = await apiAsLimitedUser.get('/admin/log/log-file');
        expect(res.status()).toBe(403);
    });

    test('[seguridad] un usuario SIN rol admin no puede leer el log de errores del servidor', async ({ apiAsLimitedUser }) => {
        const res = await apiAsLimitedUser.get('/admin/log/log-error-file');
        expect(res.status()).toBe(403);
    });
});
