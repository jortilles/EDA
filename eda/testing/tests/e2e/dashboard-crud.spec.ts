import { test, expect } from '../fixtures/e2e-base';
import { createSalesDuckDbDataSource } from '../../utils/duckdb-fixture';

test.describe.configure({ mode: 'serial' });

test.describe('Dashboards: crear, ver y borrar desde la UI', () => {
    let dsName: string;

    test('preparacion: crear via API la datasource que se usara desde la UI', async ({ api, uniqueName, track }) => {
        dsName = uniqueName('ui-ds');
        const res = await createSalesDuckDbDataSource(api, dsName, uniqueName('uifolder').toLowerCase());
        expect(res.status(), await res.text()).toBe(201);
        const body = await res.json();
        track('datasource', body.data_source_id);
    });

    test('crear un dashboard desde el dialogo "Crear nuevo informe", verlo en la lista y borrarlo', async ({ page, uniqueName }) => {
        const title = uniqueName('ui-dashboard');

        await page.goto('/#/home');
        await page.getByText('Crear nuevo informe').click();

        await page.locator('input[formcontrolname="name"]').fill(title);
        // El id "float-ds" lo comparten el <p-dropdown> (wrapper de Angular) y el <div>
        // interno que PrimeNG genera para el trigger clicable; hay que apuntar a este ultimo.
        await page.locator('div.p-dropdown#float-ds').click();
        await page.getByRole('option', { name: dsName }).click();

        await page.locator('.confirm-button').click();
        await page.waitForURL(/#\/dashboard\//, { timeout: 20_000 });
        await expect(page.locator('#myDashboard')).toBeVisible({ timeout: 15_000 });

        await page.goto('/#/home');
        const card = page.locator('.report-card', { hasText: title });
        await expect(card).toBeVisible({ timeout: 15_000 });

        await card.locator('[title="Eliminar informe"]').click();
        await page.locator('.swal2-confirm').click();

        await expect(page.locator('.report-card', { hasText: title })).toHaveCount(0, { timeout: 15_000 });
    });

    test('crear un dashboard sin rellenar el nombre mantiene el boton confirmar deshabilitado', async ({ page }) => {
        await page.goto('/#/home');
        await page.getByText('Crear nuevo informe').click();
        await expect(page.locator('.confirm-button')).toBeDisabled();
    });
});
