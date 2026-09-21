import { test, expect } from '../fixtures/base';

test.describe('Asistente de creacion de datasource (/admin/data-source/new)', () => {
    test('el desplegable de motores incluye los conectores principales', async ({ page }) => {
        await page.goto('/#/admin/data-source/new');
        await page.locator('p-dropdown').first().click();
        for (const engine of ['MySQL', 'Oracle', 'Sql Server', 'ClickHouse', 'BigQuery', 'SnowFlake']) {
            await expect(page.getByRole('option', { name: engine })).toBeVisible();
        }
        await page.keyboard.press('Escape');
    });

    test('probar conexion contra un host inalcanzable muestra un error, sin crashear', async ({ page, uniqueName }) => {
        await page.goto('/#/admin/data-source/new');

        await page.locator('#name').fill(uniqueName('ui-conexion-invalida'));
        await page.locator('p-dropdown').first().click();
        await page.getByRole('option', { name: 'MySQL' }).click();

        await page.locator('#server').fill('127.0.0.1');
        await page.locator('#port').fill('1');
        await page.locator('#database').fill('no_existe');
        await page.locator('#user').fill('no_existe');
        await page.locator('#password').fill('no_existe');

        await page.getByText('Probar conexión').click();

        await expect(page.locator('.p-toast-message-error, .swal2-popup')).toBeVisible({ timeout: 20_000 });
    });

    test('probar conexion con el formulario incompleto muestra un error de validacion', async ({ page }) => {
        await page.goto('/#/admin/data-source/new');
        await page.getByText('Probar conexión').click();
        await expect(page.locator('.p-toast-message-error, .swal2-popup')).toBeVisible({ timeout: 10_000 });
    });

    test('la lista de datasources carga y el boton de crear navega al formulario', async ({ page }) => {
        await page.goto('/#/admin/data-source');
        await page.getByText('Crear DataSource').click();
        await page.waitForURL(/#\/admin\/data-source\/new/, { timeout: 10_000 });
        await expect(page.locator('#name')).toBeVisible();
    });
});
