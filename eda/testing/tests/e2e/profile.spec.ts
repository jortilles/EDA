import { test, expect } from '../fixtures/base';

test.describe('Perfil de usuario (/profile)', () => {
    test('el perfil carga precargado con los datos del usuario actual', async ({ page, adminSession }) => {
        await page.goto('/#/profile');
        await expect(page.locator('#username')).toHaveValue('Playwright Test Admin', { timeout: 15_000 });
        await expect(page.locator('#email')).toHaveValue(adminSession.email);
    });

    test('cambiar el nombre y guardar actualiza el usuario en el servidor', async ({ page, api, adminSession }) => {
        await page.goto('/#/profile');
        await expect(page.locator('#username')).toHaveValue('Playwright Test Admin', { timeout: 15_000 });

        await page.locator('#username').fill('Playwright Test Admin (editado)');
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('.swal2-popup, .p-toast-message-success')).toBeVisible({ timeout: 10_000 });

        const res = await api.get(`/admin/user/${adminSession.userId}`);
        const body = await res.json();
        expect(body.user.name).toBe('Playwright Test Admin (editado)');
        await page.locator('.swal2-confirm').click().catch(() => null);

        // deja el nombre como estaba
        await page.locator('#username').fill('Playwright Test Admin');
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('.swal2-popup, .p-toast-message-success')).toBeVisible({ timeout: 10_000 });
    });

    /**
     * HALLAZGO: al guardar el perfil como admin, user-profile.page.ts (saveUser()) llama
     * a UserService.manageUpdateUsers(), que hace PUT /admin/user/management/:id y NUNCA
     * actualiza localStorage["user"] con el nombre/email nuevos (a diferencia del login,
     * que si escribe user/isAdmin/etc. via savingStorage()). El cambio se guarda en la
     * base de datos (confirmado en el test anterior via API) pero la sesion del propio
     * navegador se queda con el nombre ANTIGUO cacheado hasta el proximo login: un
     * refresco de pagina, o cualquier otra pantalla que lea getUserObject() (el propio
     * formulario de perfil incluido), sigue mostrando el valor desactualizado.
     */
    test('[hallazgo] tras guardar el perfil, recargar la pagina sigue mostrando el nombre antiguo', async ({ page }) => {
        await page.goto('/#/profile');
        await expect(page.locator('#username')).toHaveValue('Playwright Test Admin', { timeout: 15_000 });

        await page.locator('#username').fill('Playwright Test Admin (editado)');
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('.swal2-popup, .p-toast-message-success')).toBeVisible({ timeout: 10_000 });
        await page.locator('.swal2-confirm').click().catch(() => null);

        await page.reload();
        // Si esto deja de fallar, el bug se ha corregido: localStorage ya se sincroniza.
        await expect(page.locator('#username')).toHaveValue('Playwright Test Admin', { timeout: 15_000 });

        // deja el nombre como estaba en el servidor (en el navegador ya sigue siendo el antiguo)
        await page.locator('#username').fill('Playwright Test Admin');
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('.swal2-popup, .p-toast-message-success')).toBeVisible({ timeout: 10_000 });
    });
});
