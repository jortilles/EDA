import { test as base, expect } from '@playwright/test';
import * as path from 'path';

const USER_STORAGE = path.resolve(__dirname, '..', '..', '.auth', 'user-storage.json');

// Este archivo entero corre como el usuario LIMITADO (sin rol admin), no como el admin
// de test que usa el resto de la suite e2e.
const test = base.extend({});
test.use({ storageState: USER_STORAGE });

test.describe('Permisos en la UI para un usuario sin rol admin', () => {
    for (const route of ['/admin/users', '/admin/groups', '/admin/media', '/admin/data-source']) {
        test(`navegar a ${route} redirige a /home (RoleGuard)`, async ({ page }) => {
            await page.goto(`/#${route}`);
            await page.waitForURL(/#\/home/, { timeout: 15_000 });
            await expect(page).toHaveURL(/#\/home/);
        });
    }

    /**
     * HALLAZGO (control de acceso roto): a diferencia de /admin/users, /admin/groups,
     * /admin/media y /admin/data-source, la ruta 'logs' en pages-v3.routes.ts (linea
     * ~86-87) NO tiene "canActivate: [RoleGuard]" -- solo hereda el VerifyTokenGuard del
     * padre (requiere estar logueado, no ser admin). Confirmado tambien en el backend:
     * lib/module/admin/log/log.router.ts usa "authGuard" a secas en /log-file y
     * /log-error-file, SIN roleGuard. Resultado: cualquier usuario autenticado, sin
     * ningun grupo/rol, puede leer los logs del servidor (incluidos los de error) tanto
     * navegando a /#/logs como llamando directamente a la API -- pese a que el enlace de
     * "Gestión de logs" solo se muestra en el menu para administradores (main-left-sidebar.ts
     * L110), la proteccion real falta en ambas capas.
     */
    test('[hallazgo][seguridad] /logs es accesible sin rol admin (falta RoleGuard)', async ({ page }) => {
        await page.goto('/#/logs');
        await page.waitForLoadState('networkidle');
        // Si esto empieza a fallar porque redirige a /home, el bug ya esta corregido:
        // actualiza este test para reflejar el comportamiento correcto.
        await expect(page).not.toHaveURL(/#\/home/);
        await expect(page).toHaveURL(/#\/logs/);
    });

    test('la barra lateral no muestra la seccion de administracion', async ({ page }) => {
        await page.goto('/#/home');
        await expect(page.locator('#sidebar-btn-toggle')).toBeVisible({ timeout: 15_000 });
        // navItems para un usuario normal (sin isAdmin/isDataSourceCreator): home, crear
        // (plusSection, oculto solo para EDA_RO/observer), settings, about, logout = 5.
        // La seccion "molecula" (gestion, con los enlaces de admin) no se añade.
        await expect(page.locator('.sidebar-btn')).toHaveCount(5, { timeout: 10_000 });
    });

    test('puede seguir creando y viendo sus propios dashboards', async ({ page }) => {
        await page.goto('/#/home');
        await expect(page.getByText('Crear nuevo informe')).toBeVisible({ timeout: 15_000 });
    });
});
