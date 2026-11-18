import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * HALLAZGO: justo despues de que Angular re-renderice una fila de una tabla filtrada
 * (@for con track por id), el PRIMER click sobre un boton de esa fila a veces no llega
 * a disparar su (click) -- sin excepciones ni efecto visible, solo el foco del boton.
 * Un segundo click inmediato siempre funciona. Reproducido en /admin/users y
 * /admin/groups (ver README). Esta funcion reintenta una vez de forma segura: si el
 * primer click SI abrio el dialogo de confirmacion esperado, no reintenta (un segundo
 * click ciego quedaria bloqueado por el overlay modal de SweetAlert2).
 */
export async function clickUntilSwalConfirm(page: Page, locator: Locator): Promise<void> {
    const swal = page.locator('.swal2-popup');
    await locator.click();
    if (!(await swal.isVisible().catch(() => false))) {
        await swal.waitFor({ state: 'visible', timeout: 1_500 }).catch(() => null);
    }
    if (!(await swal.isVisible().catch(() => false))) {
        await locator.click();
    }
    await expect(swal).toBeVisible({ timeout: 10_000 });
}
