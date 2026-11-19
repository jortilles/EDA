import { test as base, expect } from '../fixtures/e2e-base';
import * as path from 'path';

const USER_STORAGE = path.resolve(__dirname, '..', '..', '.auth', 'user-storage.json');

// Este archivo entero corre como el usuario LIMITADO (sin rol admin), no como el admin
// de test que usa el resto de la suite e2e.
const test = base.extend({});
test.use({ storageState: USER_STORAGE });

test.describe('Permisos en la UI para un usuario sin rol admin', () => {
    for (const route of ['/admin/users', '/admin/groups', '/admin/media', '/admin/data-source', '/admin/alerts-management']) {
        test(`navegar a ${route} redirige a /home (RoleGuard)`, async ({ page }) => {
            await page.goto(`/#${route}`);
            await page.waitForURL(/#\/home/, { timeout: 15_000 });
            await expect(page).toHaveURL(/#\/home/);
        });
    }

    test('/logs redirige a /home para un usuario sin rol admin (RoleGuard)', async ({ page }) => {
        await page.goto('/#/logs');
        await page.waitForURL(/#\/home/, { timeout: 15_000 });
        await expect(page).toHaveURL(/#\/home/);
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
        // Tolera es ("Crear nuevo informe") y ca ("Crear nou informe") -- ver nota
        // en admin-groups.spec.ts.
        await expect(page.getByText(/Crear n(uevo|ou) informe/)).toBeVisible({ timeout: 15_000 });
    });
});
