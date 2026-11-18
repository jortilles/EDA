import { test, expect } from '../fixtures/base';

test.describe('Logs del servidor (/admin/log)', () => {
    test('sin token, se rechaza con 401', async ({ apiAnonymous }) => {
        const res = await apiAnonymous.get('/admin/log/log-file');
        expect(res.status()).toBe(401);
    });

    /**
     * HALLAZGO (control de acceso roto): /admin/log/log-file y /admin/log/log-error-file
     * (log.router.ts) solo llevan "authGuard", sin "roleGuard". El enlace "Gestión de
     * logs" solo aparece en el menu para admins (main-left-sidebar.ts:110), pero la API
     * no aplica esa misma restriccion: CUALQUIER usuario autenticado, sin ningun grupo,
     * puede leer los logs del servidor (incluido el log de errores) directamente. Ver
     * tambien el hallazgo equivalente en tests/e2e/permissions-ui.spec.ts (la ruta de
     * frontend 'logs' tampoco lleva RoleGuard).
     */
    test('[hallazgo][seguridad] un usuario SIN rol admin puede leer los logs del servidor', async ({ apiAsLimitedUser }) => {
        const res = await apiAsLimitedUser.get('/admin/log/log-file');
        // Si esto empieza a devolver 403, el bug ya esta corregido: actualiza este test.
        expect(res.status(), 'Se esperaba que un usuario sin rol admin NO pudiera leer los logs (403), pero la API se lo permitio').not.toBe(403);
    });

    test('[hallazgo][seguridad] un usuario SIN rol admin puede leer el log de errores del servidor', async ({ apiAsLimitedUser }) => {
        const res = await apiAsLimitedUser.get('/admin/log/log-error-file');
        expect(res.status(), 'Se esperaba que un usuario sin rol admin NO pudiera leer el log de errores (403), pero la API se lo permitio').not.toBe(403);
    });
});
