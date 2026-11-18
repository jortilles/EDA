import { test, expect } from '../fixtures/e2e-base';

test.describe('Home y navegacion principal', () => {
    test('home carga y muestra el boton de crear informe para un admin', async ({ page }) => {
        await page.goto('/#/home');
        await expect(page).toHaveURL(/#\/home/);
        await expect(page.getByText('Crear nuevo informe')).toBeVisible({ timeout: 15_000 });
    });

    test('la barra de navegacion lateral se renderiza con sus iconos', async ({ page }) => {
        await page.goto('/#/home');
        await expect(page.locator('#sidebar-btn-toggle')).toBeVisible({ timeout: 15_000 });
    });

    for (const route of ['/admin/users', '/admin/groups', '/admin/media', '/admin/data-source', '/logs', '/about', '/profile']) {
        test(`un admin puede navegar directamente a ${route} sin ser redirigido a login`, async ({ page }) => {
            await page.goto(`/#${route}`);
            await page.waitForLoadState('networkidle');
            await expect(page).not.toHaveURL(/#\/login/);
        });
    }

    test('logout (boton de la barra lateral) vuelve a la pantalla de login', async ({ page }) => {
        // /logout no es una ruta Angular real: el boton la intercepta en menuCommand()
        // y llama a userService.logout(). eda-icon expone "name" como @Input() de Angular,
        // no como atributo HTML reflejado, asi que no es seleccionable por [name=logout];
        // en cambio el orden de main-left-sidebar.ts (assignNavItems) garantiza que logout
        // es siempre el ULTIMO boton de nivel superior de la barra, para cualquier rol.
        await page.goto('/#/home');
        await page.locator('.sidebar-btn').last().click();
        await page.waitForURL(/#\/(login)?$/, { timeout: 15_000 });
        await expect(page.locator('#email')).toBeVisible();
    });
});
