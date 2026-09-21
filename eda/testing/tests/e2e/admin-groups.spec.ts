import { test, expect } from '../fixtures/e2e-base';
import { clickUntilSwalConfirm } from '../fixtures/ui-helpers';

test.describe('Administracion de grupos (/admin/groups)', () => {
    test('crear un grupo desde el dialogo, verlo en la lista y borrarlo', async ({ page, uniqueName }) => {
        const name = uniqueName('ui-group');

        await page.goto('/#/admin/groups');
        await page.getByText('Crear Grupo').click();

        await page.locator('.p-dialog input').first().fill(name);
        await page.locator('.p-dialog .confirm-button').click();

        await expect(page.locator('.swal2-popup')).toBeVisible({ timeout: 10_000 });
        await page.locator('.swal2-confirm').click();
        await expect(page.locator('.swal2-popup')).toHaveCount(0, { timeout: 10_000 });

        await page.locator('input[placeholder="Buscar grupos..."]').fill(name);
        const row = page.locator('table tr', { hasText: name });
        await expect(row).toBeVisible({ timeout: 15_000 });

        await clickUntilSwalConfirm(page, row.locator('button').last());
        await page.locator('.swal2-confirm').click();

        await expect(page.locator('table tr', { hasText: name })).toHaveCount(0, { timeout: 15_000 });
    });

    test('el grupo de administradores esta protegido y no se puede borrar', async ({ page }) => {
        await page.goto('/#/admin/groups');
        const row = page.locator('table tr', { hasText: 'EDA_ADMIN_ROLE' }).first();
        await expect(row).toBeVisible({ timeout: 15_000 });
        await expect(row.locator('button').last()).toBeDisabled();
    });
});
