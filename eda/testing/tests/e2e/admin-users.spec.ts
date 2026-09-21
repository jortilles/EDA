import { test, expect } from '../fixtures/base';
import { clickUntilSwalConfirm } from '../fixtures/ui-helpers';

test.describe('Administracion de usuarios (/admin/users)', () => {
    test('crear un usuario desde el dialogo, verlo en la lista y borrarlo', async ({ page, uniqueName }) => {
        const name = 'Usuario UI Playwright';
        const email = `${uniqueName('ui-user')}@eda-tests.local`;

        await page.goto('/#/admin/users');
        await page.getByText('Crear Usuario').click();

        // Los campos del dialogo no tienen id/formcontrolname (solo [(ngModel)]), asi que
        // se localizan por orden dentro del dialogo PrimeNG actualmente abierto.
        const dialogInputs = page.locator('.p-dialog input');
        await dialogInputs.nth(0).fill(name);
        await dialogInputs.nth(1).fill(email);
        await page.locator('.p-dialog input[type="password"]').fill('Pw_UiUser_123!');

        await page.locator('.p-dialog .confirm-button').click();

        // Confirma la creacion (SweetAlert2 "Usuario creado") y filtra la lista (52+
        // usuarios en la BBDD de dev, paginada a 10 por pagina: sin filtrar, el nuevo
        // usuario podria no estar en la pagina visible).
        await expect(page.locator('.swal2-popup')).toBeVisible({ timeout: 10_000 });
        await page.locator('.swal2-confirm').click();
        await expect(page.locator('.swal2-popup')).toHaveCount(0, { timeout: 10_000 });
        await page.locator('input[placeholder="Buscar usuarios..."]').fill(email);

        const row = page.locator('table tr', { hasText: email });
        await expect(row).toBeVisible({ timeout: 15_000 });

        await clickUntilSwalConfirm(page, row.locator('button').last());
        await page.locator('.swal2-confirm').click();
        await expect(page.locator('.swal2-popup')).toBeVisible({ timeout: 10_000 }); // 2o swal: "borrado correctamente"
        await page.locator('.swal2-confirm').click();

        await expect(page.locator('table tr', { hasText: email })).toHaveCount(0, { timeout: 15_000 });
    });

    test('buscar usuarios filtra la lista', async ({ page, adminSession }) => {
        await page.goto('/#/admin/users');
        await page.locator('input[placeholder="Buscar usuarios..."]').fill(adminSession.email);
        await expect(page.locator('table tr', { hasText: adminSession.email })).toBeVisible({ timeout: 10_000 });
    });
});
