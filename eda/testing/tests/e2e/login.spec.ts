import { test, expect } from '../fixtures/e2e-base';

// Esta suite prueba el flujo de login en si mismo, asi que arranca SIN sesion
// (a diferencia del resto de tests e2e, que reutilizan el storageState ya logueado).
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login', () => {
    test('login con credenciales validas redirige a /home', async ({ page, adminSession }) => {
        await page.goto('/#/login');
        await page.locator('#email').fill(adminSession.email);
        await page.locator('#password').fill(adminSession.password);
        await page.locator('form button[type="submit"]').click();
        await page.waitForURL(/#\/home/, { timeout: 15_000 });
        await expect(page).toHaveURL(/#\/home/);
    });

    test('login con password incorrecta muestra un error y no navega', async ({ page, adminSession }) => {
        await page.goto('/#/login');
        await page.locator('#email').fill(adminSession.email);
        await page.locator('#password').fill('contraseña-incorrecta-xyz');
        await page.locator('form button[type="submit"]').click();

        await expect(page.locator('.swal2-popup')).toBeVisible({ timeout: 10_000 });
        await expect(page).not.toHaveURL(/#\/home/);
    });

    test('login con usuario inexistente muestra un error', async ({ page }) => {
        await page.goto('/#/login');
        await page.locator('#email').fill('usuario-que-no-existe-xyz@eda-tests.local');
        await page.locator('#password').fill('lo-que-sea');
        await page.locator('form button[type="submit"]').click();

        await expect(page.locator('.swal2-popup')).toBeVisible({ timeout: 10_000 });
    });

    test('acceder a una ruta protegida sin sesion redirige a login', async ({ page }) => {
        await page.goto('/#/home');
        await page.waitForURL(/#\/(login)?/, { timeout: 15_000 });
        await expect(page.locator('#email')).toBeVisible();
    });
});
